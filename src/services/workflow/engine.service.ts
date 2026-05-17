// ============================================================================
// WORKFLOW ENGINE SERVICE — core orchestration runtime
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors';

const log = createLogger('WorkflowEngine');

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
      await executeActions(startStep.postActions, {
        __entityType: input.entityType,
        __entityId: input.entityId,
        __instanceId: instance.id,
      });
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
    const mergedVars = { ...prevVars, ...(input.variables ?? {}) };

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
      await executeActions(currentStep.postActions, { ...mergedVars, __action: input.action });
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
      await db.workflowInstance.update({
        where: { id: instanceId },
        data: { variables: toJsonValue({ ...mergedVars, _forkBranches: currentStep.parallelSteps }) },
      });
      log.info('Workflow forked', { instanceId, branches: currentStep.parallelSteps });
      return instance;
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
        await executeActions(nextStep.postActions, mergedVars);
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
      await executeActions(nextStep.postActions, { ...mergedVars, __stepType: nextStep.type });
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
): Promise<void> {
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'notify':
          await executeNotifyAction(action.config, context);
          break;
        case 'update_field':
          await executeUpdateFieldAction(action.config, context);
          break;
        case 'call_api':
          log.info('API call action (placeholder)', { config: action.config });
          break;
        case 'trigger_job':
          log.info('Trigger job action (placeholder)', { config: action.config });
          break;
        default:
          log.warn('Unknown action type', { type: action.type });
      }
    } catch (error) {
      log.error('Action execution failed', { type: action.type, error: error as Error });
    }
  }
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
