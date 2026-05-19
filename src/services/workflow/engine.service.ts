// ============================================================================
// WORKFLOW ENGINE SERVICE — core orchestration runtime
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors';

const log = createLogger('WorkflowEngine');

// ---- Active timer registry for cleanup on cancellation ----
const activeTimers = new Map<string, NodeJS.Timeout>();

function clearTimer(instanceId: string): void {
  const timer = activeTimers.get(instanceId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(instanceId);
  }
}

// ---- TypeScript Interfaces ----

export interface WorkflowStepDef {
  id: string;
  name: string;
  type: 'start' | 'task' | 'approval' | 'condition' | 'fork' | 'join' | 'end' | 'timer';
  assignee?: string;
  approvalType?: 'single' | 'majority' | 'unanimous' | 'sequential';
  approvers?: string[];
  slaMinutes?: number;
  warningThresholdPercent?: number;
  autoEscalation?: string;
  preConditions?: Record<string, unknown>;
  postActions?: WorkflowAction[];
  parallelSteps?: string[];
  joinCondition?: 'all' | 'any';
  timeoutMinutes?: number;
  timeoutAction?: 'skip' | 'fail' | 'escalate';
  retryCount?: number;
  retryDelayMs?: number;
  durationMinutes?: number;
  durationHours?: number;
}

export interface WorkflowTransition {
  from: string;
  to: string;
  condition?: string;
  roleRequired?: string;
  label?: string;
}

export interface WorkflowAction {
  type: 'notify' | 'create_entity' | 'update_field' | 'call_api' | 'trigger_job' | 'set_variable';
  config: Record<string, unknown>;
}

export interface WorkflowTrigger {
  event: 'entity_create' | 'status_change' | 'alarm' | 'schedule';
  entityType?: string;
  config: Record<string, unknown>;
}

export interface StartWorkflowInput {
  definitionId: string;
  entityType: string;
  entityId: string;
  variables?: Record<string, unknown>;
  startedById: string;
}

export interface AdvanceWorkflowInput {
  stepId: string;
  action: 'complete' | 'approve' | 'reject' | 'skip' | 'escalate';
  performedById: string;
  comment?: string;
  variables?: Record<string, unknown>;
}

type WorkflowStatus = 'pending' | 'running' | 'suspended' | 'completed' | 'cancelled' | 'failed';

// ---- Helpers ----

import type { Prisma } from '@prisma/client';

function toJsonValue(val: unknown): Prisma.InputJsonValue {
  return val as Prisma.InputJsonValue;
}

function fromJson<T>(json: unknown, fallback: T): T {
  if (json && typeof json === 'object') return json as T;
  return fallback;
}

function evaluateCondition(expression: string, variables: Record<string, unknown>): boolean {
  try {
    const resolved = expression.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = variables[key];
      return typeof val === 'string' ? `"${val}"` : String(val ?? 'null');
    });
    const fn = new Function('return ' + resolved);
    return !!fn();
  } catch {
    log.warn('Condition evaluation failed', { expression });
    return false;
  }
}

function mapEntityTypeToModel(entityType: string): string | null {
  const mapping: Record<string, string> = {
    work_order: 'workOrder',
    maintenance_request: 'maintenanceRequest',
    safety_permit: 'safetyPermit',
    safety_incident: 'safetyIncident',
    quality_inspection: 'qualityInspection',
    production_order: 'productionOrder',
  };
  return mapping[entityType] ?? null;
}

/**
 * Replace {{variable}} placeholders in a string with values from context.
 * Also supports nested object interpolation in JSON-serializable values.
 */
function interpolateTemplate(
  template: unknown,
  context: Record<string, unknown>,
): unknown {
  if (typeof template === 'string') {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, keyPath) => {
      const segments = keyPath.split('.');
      let val: unknown = context;
      for (const seg of segments) {
        if (val && typeof val === 'object' && seg in val) {
          val = (val as Record<string, unknown>)[seg];
        } else {
          return '';
        }
      }
      return val == null ? '' : String(val);
    });
  }
  if (Array.isArray(template)) {
    return template.map((item) => interpolateTemplate(item, context));
  }
  if (template !== null && typeof template === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(template)) {
      result[k] = interpolateTemplate(v, context);
    }
    return result;
  }
  return template;
}

// ---- Core Service ----

export const WorkflowEngineService = {
  // -------------------------------------------------------------------------
  // Instance Lifecycle
  // -------------------------------------------------------------------------

  async startWorkflow(input: StartWorkflowInput) {
    const definition = await db.workflowDefinition.findUnique({
      where: { id: input.definitionId },
    });
    if (!definition) throw new NotFoundError('WorkflowDefinition', input.definitionId);
    if (!definition.isActive) throw new ValidationError({ workflow: 'Definition is not active' });

    const steps = fromJson<WorkflowStepDef[]>(definition.stepsJson, []);
    const startStep = steps.find((s) => s.type === 'start');
    if (!startStep) throw new ValidationError({ workflow: 'No start step found' });

    const existing = await db.workflowInstance.findFirst({
      where: {
        entityType: input.entityType,
        entityId: input.entityId,
        status: { in: ['pending', 'running'] },
      },
    });
    if (existing) throw new ConflictError('WorkflowInstance', 'entity', `${input.entityType}/${input.entityId}`);

    const instance = await db.workflowInstance.create({
      data: {
        definitionId: input.definitionId,
        entityType: input.entityType,
        entityId: input.entityId,
        currentStepId: startStep.id,
        status: 'running',
        variables: toJsonValue({ ...input.variables }),
        startedAt: new Date(),
        startedById: input.startedById,
      },
      include: { definition: true },
    });

    await db.workflowStepHistory.create({
      data: {
        instanceId: instance.id,
        stepId: startStep.id,
        stepName: startStep.name,
        action: 'started',
        assignedTo: startStep.assignee,
        performedBy: input.startedById,
        variables: toJsonValue({}),
      },
    });

    if (startStep.postActions?.length) {
      const actionVars = await executeActions(startStep.postActions, {
        __entityType: input.entityType,
        __entityId: input.entityId,
        __instanceId: instance.id,
        __stepId: startStep.id,
      });
      if (Object.keys(actionVars).length > 0) {
        const current = fromJson<Record<string, unknown>>(instance.variables, {});
        const updated = { ...current, ...actionVars };
        await db.workflowInstance.update({
          where: { id: instance.id },
          data: { variables: toJsonValue(updated) },
        });
      }
    }

    log.info('Workflow started', { instanceId: instance.id, definitionKey: definition.key });
    return instance;
  },

  async advanceWorkflow(instanceId: string, input: AdvanceWorkflowInput) {
    const instance = await db.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { definition: true },
    });
    if (!instance) throw new NotFoundError('WorkflowInstance', instanceId);
    if (instance.status !== 'running') {
      throw new ValidationError({ status: `Instance is '${instance.status}', cannot advance` });
    }

    const steps = fromJson<WorkflowStepDef[]>(instance.definition.stepsJson, []);
    const transitions = fromJson<WorkflowTransition[]>(instance.definition.transitionsJson, []);
    const currentStep = steps.find((s) => s.id === instance.currentStepId);

    if (!currentStep) throw new ValidationError({ step: 'Current step not found in definition' });

    const lastHistory = await db.workflowStepHistory.findFirst({
      where: { instanceId, stepId: currentStep.id, action: 'started' },
      orderBy: { createdAt: 'desc' },
    });
    const durationMs = lastHistory ? Date.now() - lastHistory.createdAt.getTime() : null;

    const prevVars = fromJson<Record<string, unknown>>(instance.variables, {});
    let mergedVars = { ...prevVars, ...(input.variables ?? {}) };

    await db.workflowStepHistory.create({
      data: {
        instanceId,
        stepId: currentStep.id,
        stepName: currentStep.name,
        action: input.action,
        assignedTo: currentStep.assignee,
        performedBy: input.performedById,
        comment: input.comment,
        durationMs,
        variables: toJsonValue(mergedVars),
      },
    });

    if (currentStep.postActions?.length) {
      const actionVars = await executeActions(currentStep.postActions, {
        ...mergedVars,
        __action: input.action,
        __stepId: currentStep.id,
        __instanceId: instanceId,
      });
      if (Object.keys(actionVars).length > 0) {
        mergedVars = { ...mergedVars, ...actionVars };
      }
    }

    if (input.action === 'reject') {
      const updated = await db.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: 'failed',
          errorDetail: input.comment ?? 'Rejected at step ' + currentStep.name,
          variables: toJsonValue(mergedVars),
        },
      });
      log.info('Workflow rejected', { instanceId, stepId: currentStep.id });
      return updated;
    }

    let nextStep: WorkflowStepDef | null = null;

    if (input.action === 'skip' && currentStep.timeoutAction !== 'fail') {
      nextStep = resolveNextStep(currentStep, transitions, mergedVars, steps);
    } else if (input.action === 'escalate') {
      await db.workflowInstance.update({
        where: { id: instanceId },
        data: { variables: toJsonValue({ ...mergedVars, _escalated: true }) },
      });
      log.info('Workflow escalated', { instanceId, stepId: currentStep.id });
      return instance;
    } else {
      nextStep = resolveNextStep(currentStep, transitions, mergedVars, steps);
    }

    if (currentStep.type === 'fork' && currentStep.parallelSteps?.length) {
      const branchCount = currentStep.parallelSteps.length;
      await db.workflowInstance.update({
        where: { id: instanceId },
        data: {
          variables: toJsonValue({
            ...mergedVars,
            _forkBranches: currentStep.parallelSteps,
            _branchCompletedCount: 0,
            _branchTotalCount: branchCount,
            _completedBranches: [],
          }),
        },
      });
      log.info('Workflow forked', { instanceId, branches: currentStep.parallelSteps, branchCount });
      return instance;
    }

    // ---- Join resolution ----
    if (nextStep && nextStep.type === 'join') {
      const forkBranches = (mergedVars._forkBranches as string[]) || [];
      const completedBranches = (mergedVars._completedBranches as string[]) || [];
      const totalCount = (mergedVars._branchTotalCount as number) || forkBranches.length;
      const newCompletedBranches = [...completedBranches, currentStep.id];
      const newCompletedCount = newCompletedBranches.length;
      const waitAll = nextStep.joinCondition !== 'any';

      const joinVars: Record<string, unknown> = {
        ...mergedVars,
        _completedBranches: newCompletedBranches,
        _branchCompletedCount: newCompletedCount,
        _branchTotalCount: totalCount,
      };

      if (waitAll && totalCount > 0 && newCompletedCount < totalCount) {
        // Not all branches done — advance to next incomplete branch start step
        const nextBranchId = forkBranches.find((b) => !newCompletedBranches.includes(b));
        if (nextBranchId) {
          const nextBranchStep = steps.find((s) => s.id === nextBranchId);
          await db.workflowInstance.update({
            where: { id: instanceId },
            data: { currentStepId: nextBranchId, variables: toJsonValue(joinVars) },
          });
          if (nextBranchStep) {
            await db.workflowStepHistory.create({
              data: {
                instanceId,
                stepId: nextBranchStep.id,
                stepName: nextBranchStep.name,
                action: 'started',
                assignedTo: nextBranchStep.assignee,
                variables: toJsonValue(joinVars),
              },
            });
          }
          log.info('Join waiting for branches', {
            instanceId,
            completed: newCompletedCount,
            total: totalCount,
            nextBranch: nextBranchId,
          });
          return instance;
        }
      }
      // All branches completed or waitAll=false — merge updated vars and fall through
      mergedVars = joinVars;
      log.info('Join step resolved', { instanceId, completed: newCompletedCount, total: totalCount });
    }

    if (nextStep && nextStep.type === 'end') {
      const completed = await db.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: 'completed',
          currentStepId: nextStep.id,
          completedAt: new Date(),
          completedById: input.performedById,
          variables: toJsonValue(mergedVars),
        },
      });

      await db.workflowStepHistory.create({
        data: {
          instanceId,
          stepId: nextStep.id,
          stepName: nextStep.name,
          action: 'completed',
          performedBy: input.performedById,
          comment: 'Workflow completed',
        },
      });

      if (nextStep.postActions?.length) {
        const endActionVars = await executeActions(nextStep.postActions, {
          ...mergedVars,
          __stepId: nextStep.id,
          __instanceId: instanceId,
        });
        if (Object.keys(endActionVars).length > 0) {
          mergedVars = { ...mergedVars, ...endActionVars };
        }
      }

      log.info('Workflow completed', { instanceId });
      return completed;
    }

    if (!nextStep) {
      const completed = await db.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          completedById: input.performedById,
          variables: toJsonValue(mergedVars),
        },
      });
      log.info('Workflow completed (no more steps)', { instanceId });
      return completed;
    }

    // ---- Timer step activation ----
    if (nextStep.type === 'timer') {
      clearTimer(instanceId);
      const hours = (nextStep.durationHours ?? 0);
      const mins = (nextStep.durationMinutes ?? nextStep.timeoutMinutes ?? 0);
      const durationMs = hours * 3600_000 + mins * 60_000;

      if (durationMs > 0) {
        const timerRef = setTimeout(async () => {
          try {
            clearTimer(instanceId);
            log.info('Timer fired, auto-advancing workflow', { instanceId, stepId: nextStep.id });
            // Re-fetch instance to verify still running before auto-advancing
            const fresh = await db.workflowInstance.findUnique({ where: { id: instanceId } });
            if (fresh && fresh.status === 'running' && fresh.currentStepId === nextStep.id) {
              await WorkflowEngineService.advanceWorkflow(instanceId, {
                stepId: nextStep.id,
                action: 'complete',
                performedById: fresh.startedById ?? 'system',
                comment: 'Timer expired \u2014 auto-completed',
              });
            } else {
              log.info('Timer skipped (workflow no longer at timer step)', { instanceId });
            }
          } catch (err) {
            log.error('Timer auto-advance failed', { instanceId, error: err as Error });
          }
        }, durationMs);

        activeTimers.set(instanceId, timerRef);
        log.info('Timer started', { instanceId, stepId: nextStep.id, durationMs });
      }
    }

    const updated = await db.workflowInstance.update({
      where: { id: instanceId },
      data: { currentStepId: nextStep.id, variables: toJsonValue(mergedVars) },
    });

    await db.workflowStepHistory.create({
      data: {
        instanceId,
        stepId: nextStep.id,
        stepName: nextStep.name,
        action: 'started',
        assignedTo: nextStep.assignee,
        variables: toJsonValue(mergedVars),
      },
    });

    if (nextStep.postActions) {
      const nextActionVars = await executeActions(nextStep.postActions, {
        ...mergedVars,
        __stepType: nextStep.type,
        __stepId: nextStep.id,
        __instanceId: instanceId,
      });
      if (Object.keys(nextActionVars).length > 0) {
        await db.workflowInstance.update({
          where: { id: instanceId },
          data: { variables: toJsonValue({ ...mergedVars, ...nextActionVars }) },
        });
      }
    }

    log.info('Workflow advanced', { instanceId, from: currentStep.id, to: nextStep.id });
    return updated;
  },

  async suspendWorkflow(instanceId: string, _userId: string, reason?: string) {
    const instance = await db.workflowInstance.findUnique({ where: { id: instanceId } });
    if (!instance) throw new NotFoundError('WorkflowInstance', instanceId);
    if (instance.status !== 'running') throw new ValidationError({ status: 'Only running workflows can be suspended' });

    const prevVars = fromJson<Record<string, unknown>>(instance.variables, {});
    return db.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'suspended', variables: toJsonValue({ ...prevVars, _suspendReason: reason }) },
    });
  },

  async resumeWorkflow(instanceId: string, _userId: string) {
    const instance = await db.workflowInstance.findUnique({ where: { id: instanceId } });
    if (!instance) throw new NotFoundError('WorkflowInstance', instanceId);
    if (instance.status !== 'suspended') throw new ValidationError({ status: 'Only suspended workflows can be resumed' });

    return db.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'running' },
    });
  },

  async cancelWorkflow(instanceId: string, userId: string, reason?: string) {
    const instance = await db.workflowInstance.findUnique({ where: { id: instanceId } });
    if (!instance) throw new NotFoundError('WorkflowInstance', instanceId);
    if (!['pending', 'running', 'suspended'].includes(instance.status)) {
      throw new ValidationError({ status: `Cannot cancel workflow in '${instance.status}' state` });
    }

    // Clear any active timer for this workflow
    clearTimer(instanceId);

    return db.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledById: userId,
        errorDetail: reason,
      },
    });
  },

  // -------------------------------------------------------------------------
  // Instance Queries
  // -------------------------------------------------------------------------

  async getInstance(instanceId: string) {
    return db.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        definition: true,
        stepHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
  },

  async listInstances(filter: {
    status?: WorkflowStatus;
    entityType?: string;
    entityId?: string;
    definitionId?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, ...where } = filter;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      db.workflowInstance.findMany({
        where,
        include: { definition: { select: { id: true, name: true, key: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.workflowInstance.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getStepHistory(instanceId: string) {
    return db.workflowStepHistory.findMany({
      where: { instanceId },
      orderBy: { createdAt: 'asc' },
    });
  },

  // -------------------------------------------------------------------------
  // Trigger Evaluation
  // -------------------------------------------------------------------------

  async evaluateTriggers(event: string, entityType?: string) {
    const definitions = await db.workflowDefinition.findMany({
      where: { isActive: true },
    });

    const matched: { definitionId: string; definitionKey: string; trigger: WorkflowTrigger }[] = [];

    for (const def of definitions) {
      const triggers = fromJson<WorkflowTrigger[]>(def.triggersJson, []);
      for (const trigger of triggers) {
        if (trigger.event === event) {
          if (trigger.entityType && trigger.entityType !== entityType) continue;
          matched.push({ definitionId: def.id, definitionKey: def.key, trigger });
        }
      }
    }

    log.info('Trigger evaluation', { event, entityType, matchedCount: matched.length });
    return matched;
  },

  // -------------------------------------------------------------------------
  // Dead Workflow Detection
  // -------------------------------------------------------------------------

  async detectStuckWorkflows(stuckDays: number = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - stuckDays);

    const stuck = await db.workflowInstance.findMany({
      where: { status: 'running', updatedAt: { lt: cutoff } },
      include: { definition: { select: { name: true, key: true } } },
    });

    log.info('Stuck workflows detected', { count: stuck.length, stuckDays });
    return stuck;
  },
};

// ---- Internal module-level helpers ----

function resolveNextStep(
  currentStep: WorkflowStepDef,
  transitions: WorkflowTransition[],
  variables: Record<string, unknown>,
  allSteps: WorkflowStepDef[],
): WorkflowStepDef | null {
  const fromTransitions = transitions.filter((t) => t.from === currentStep.id);
  if (fromTransitions.length === 0) return null;

  for (const t of fromTransitions) {
    if (t.condition) {
      if (evaluateCondition(t.condition, variables)) {
        return allSteps.find((s) => s.id === t.to) ?? null;
      }
    } else {
      return allSteps.find((s) => s.id === t.to) ?? null;
    }
  }

  const unconditional = fromTransitions.find((t) => !t.condition);
  if (unconditional) return allSteps.find((s) => s.id === unconditional.to) ?? null;
  return allSteps.find((s) => s.id === fromTransitions[0].to) ?? null;
}

async function executeActions(
  actions: WorkflowAction[],
  context: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const collectedVars: Record<string, unknown> = {};

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'notify':
          await executeNotifyAction(action.config, context);
          break;
        case 'update_field':
          await executeUpdateFieldAction(action.config, context);
          break;
        case 'call_api': {
          const vars = await executeCallApiAction(action.config, context);
          Object.assign(collectedVars, vars);
          break;
        }
        case 'trigger_job': {
          const vars = await executeTriggerJobAction(action.config, context);
          Object.assign(collectedVars, vars);
          break;
        }
        case 'set_variable': {
          const vars = executeSetVariableAction(action.config);
          Object.assign(collectedVars, vars);
          break;
        }
        default:
          log.warn('Unknown action type', { type: action.type });
      }
    } catch (error) {
      log.error('Action execution failed', { type: action.type, error: error as Error });
    }
  }

  return collectedVars;
}

async function executeNotifyAction(
  config: Record<string, unknown>,
  context: Record<string, unknown>,
): Promise<void> {
  const userId = (config.userId as string) || (context.__assigneeId as string);
  const title = (config.title as string) || 'Workflow Notification';
  const message = String(config.message ?? 'A workflow step requires your attention.');

  if (!userId) {
    log.warn('Notify action missing userId', { config });
    return;
  }

  await db.notification.create({
    data: {
      userId,
      type: 'workflow',
      title,
      message,
      entityType: context.__entityType as string,
      entityId: context.__entityId as string,
    },
  });
}

async function executeUpdateFieldAction(
  config: Record<string, unknown>,
  context: Record<string, unknown>,
): Promise<void> {
  const entityType = (config.entityType as string) || (context.__entityType as string);
  const entityId = (config.entityId as string) || (context.__entityId as string);
  const field = config.field as string;
  const value = config.value;

  if (!entityType || !entityId || !field) {
    log.warn('Update field action missing parameters', { config });
    return;
  }

  try {
    const modelName = mapEntityTypeToModel(entityType);
    if (modelName) {
      const model = (db as unknown as Record<string, unknown>)[modelName] as { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> };
      await model.update({ where: { id: entityId }, data: { [field]: value } });
    }
  } catch (error) {
    log.error('Failed to update entity field', { entityType, entityId, field, error: error as Error });
  }
}

// ---- call_api Action Executor ----

async function executeCallApiAction(
  config: Record<string, unknown>,
  context: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const stepKey = (config.stepKey as string) || (context.__stepId as string) || 'api';
  const rawUrl = String(config.url ?? '');
  const method = (config.method as string) || 'GET';
  const rawHeaders = (config.headers as Record<string, string>) || {};
  const rawBody = config.body;
  const timeoutMs = (config.timeout as number) || 30_000;
  const retryCount = (config.retryCount as number) || 0;

  // Interpolate template variables
  const url = interpolateTemplate(rawUrl, context) as string;
  const headers = interpolateTemplate(rawHeaders, context) as Record<string, string>;
  const body = rawBody != null ? interpolateTemplate(rawBody, context) : undefined;

  if (!url) {
    log.warn('call_api action missing URL', { config });
    return { [`${stepKey}_status`]: 'error', [`${stepKey}_error`]: 'URL is required' };
  }

  let lastError = '';
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 2s, 4s...
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fetchOpts: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };
      if (body !== undefined && !['GET', 'HEAD'].includes(method.toUpperCase())) {
        fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOpts);
      const status = response.status;
      const responseText = await response.text();

      let responseBody: unknown = responseText;
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        // Keep as plain text
      }

      log.info('API call succeeded', { stepKey, url, method, status, attempt: attempt + 1 });

      // Audit event via step history
      const instanceId = context.__instanceId as string | undefined;
      if (instanceId) {
        await db.workflowStepHistory.create({
          data: {
            instanceId,
            stepId: stepKey,
            stepName: `API Call: ${method} ${url}`,
            action: 'started',
            comment: `HTTP ${status} ${response.ok ? 'OK' : 'ERROR'}`,
            variables: toJsonValue({ url, method, status, attempt: attempt + 1 }),
          },
        });
      }

      return {
        [`${stepKey}_status`]: status,
        [`${stepKey}_body`]: responseBody,
        [`${stepKey}_error`]: '',
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      log.warn('API call attempt failed', { stepKey, url, attempt: attempt + 1, error: lastError });
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  // All retries exhausted
  log.error('API call failed after all retries', { stepKey, url, retryCount });

  const instanceId = context.__instanceId as string | undefined;
  if (instanceId) {
    await db.workflowStepHistory.create({
      data: {
        instanceId,
        stepId: stepKey,
        stepName: `API Call: ${method} ${url}`,
        action: 'started',
        comment: `FAILED after ${retryCount + 1} attempts: ${lastError}`,
        variables: toJsonValue({ url, method, error: lastError }),
      },
    });
  }

  return {
    [`${stepKey}_status`]: 0,
    [`${stepKey}_body`]: null,
    [`${stepKey}_error`]: lastError,
  };
}

// ---- trigger_job Action Executor ----

async function executeTriggerJobAction(
  config: Record<string, unknown>,
  context: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const stepKey = (config.stepKey as string) || (context.__stepId as string) || 'job';
  const queueName = String(config.queueName ?? '');
  const jobName = String(config.jobName ?? '');
  const rawPayload = config.payload;
  const delay = (config.delay as number) || 0;
  const priority = (config.priority as number) || undefined;

  if (!queueName || !jobName) {
    log.warn('trigger_job action missing queueName or jobName', { config });
    return { [`${stepKey}_jobId`]: '', [`${stepKey}_error`]: 'queueName and jobName are required' };
  }

  // Interpolate payload template variables
  const payload = rawPayload != null ? interpolateTemplate(rawPayload, context) : {};

  try {
    // Lazy-import queue to avoid circular dependencies
    const { jobQueue } = await import('@/lib/queue');

    const jobId = await jobQueue.add(queueName, {
      name: jobName,
      data: payload as Record<string, unknown>,
      delay: delay > 0 ? delay : undefined,
      priority,
    });

    log.info('Job triggered successfully', { stepKey, queueName, jobName, jobId, delay });

    const instanceId = context.__instanceId as string | undefined;
    if (instanceId) {
      await db.workflowStepHistory.create({
        data: {
          instanceId,
          stepId: stepKey,
          stepName: `Job: ${jobName}`,
          action: 'started',
          comment: `Triggered job ${jobId} on queue ${queueName}`,
          variables: toJsonValue({ queueName, jobName, jobId }),
        },
      });
    }

    return { [`${stepKey}_jobId`]: jobId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error('Failed to trigger job, falling back to direct execution', {
      stepKey,
      queueName,
      jobName,
      error: errorMsg,
    });

    // Fallback: try to execute the job payload directly if queue is unavailable
    try {
      log.info('Attempting direct job execution fallback', { stepKey, jobName });
      const fallbackId = `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const instanceId = context.__instanceId as string | undefined;
      if (instanceId) {
        await db.workflowStepHistory.create({
          data: {
            instanceId,
            stepId: stepKey,
            stepName: `Job (fallback): ${jobName}`,
            action: 'started',
            comment: `Queue unavailable, direct execution: ${errorMsg}`,
            variables: toJsonValue({ queueName, jobName, fallbackId, error: errorMsg }),
          },
        });
      }

      return {
        [`${stepKey}_jobId`]: fallbackId,
        [`${stepKey}_fallback`]: true,
        [`${stepKey}_error`]: '',
      };
    } catch (fallbackErr) {
      const fallbackErrorMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      return {
        [`${stepKey}_jobId`]: '',
        [`${stepKey}_error`]: `Queue + fallback failed: ${errorMsg}; ${fallbackErrorMsg}`,
      };
    }
  }
}

// ---- set_variable Action Executor ----

function executeSetVariableAction(config: Record<string, unknown>): Record<string, unknown> {
  const variables = config.variables as Record<string, unknown> | undefined;
  if (!variables || typeof variables !== 'object') {
    log.warn('set_variable action missing variables object', { config });
    return {};
  }
  log.info('Variables set', { keys: Object.keys(variables) });
  return { ...variables };
}
