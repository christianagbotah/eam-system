// ============================================================================
// WORKFLOW DESIGNER SERVICE — template CRUD, validation, import/export
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import type { Prisma } from '@prisma/client';
import type { WorkflowStepDef, WorkflowTransition, WorkflowTrigger } from './engine.service';

const log = createLogger('WorkflowDesigner');

// ---- Interfaces ----

export interface CreateDefinitionInput {
  name: string;
  key: string;
  category?: string;
  description?: string;
  steps?: WorkflowStepDef[];
  transitions?: WorkflowTransition[];
  triggers?: WorkflowTrigger[];
  variablesSchema?: Record<string, unknown>;
  createdById: string;
}

export interface UpdateDefinitionInput {
  name?: string;
  description?: string;
  steps?: WorkflowStepDef[];
  transitions?: WorkflowTransition[];
  triggers?: WorkflowTrigger[];
  variablesSchema?: Record<string, unknown>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ---- Categories ----

export const WORKFLOW_CATEGORIES = [
  'maintenance', 'procurement', 'safety', 'quality', 'engineering',
] as const;

export type WorkflowCategory = (typeof WORKFLOW_CATEGORIES)[number];

// ---- Helpers ----

function toJsonValue(val: unknown): Prisma.InputJsonValue {
  return val as Prisma.InputJsonValue;
}

function fromJson<T>(json: unknown, fallback: T): T {
  if (json && typeof json === 'object') return json as T;
  return fallback;
}

// ---- Service ----

export const WorkflowDesignerService = {
  // -------------------------------------------------------------------------
  // Definition CRUD
  // -------------------------------------------------------------------------

  async createDefinition(input: CreateDefinitionInput) {
    if (!/^[a-z][a-z0-9_]*$/.test(input.key)) {
      throw new ValidationError({ key: 'Key must be lowercase alphanumeric with underscores, starting with a letter' });
    }

    const existing = await db.workflowDefinition.findUnique({ where: { key: input.key } });
    if (existing) throw new ConflictError('WorkflowDefinition', 'key', input.key);

    const validation = validateDefinition({
      steps: input.steps ?? [],
      transitions: input.transitions ?? [],
      triggers: input.triggers ?? [],
    });
    if (!validation.valid) {
      throw new ValidationError({ definition: validation.errors.join('; ') });
    }

    const definition = await db.workflowDefinition.create({
      data: {
        name: input.name,
        key: input.key,
        category: input.category,
        description: input.description,
        stepsJson: toJsonValue(input.steps ?? []),
        transitionsJson: toJsonValue(input.transitions ?? []),
        triggersJson: toJsonValue(input.triggers ?? []),
        variablesSchema: toJsonValue(input.variablesSchema),
        createdById: input.createdById,
      },
    });

    log.info('Workflow definition created', { id: definition.id, key: input.key });
    return definition;
  },

  async updateDefinition(id: string, input: UpdateDefinitionInput) {
    const existing = await db.workflowDefinition.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('WorkflowDefinition', id);

    if (input.steps || input.transitions) {
      const validation = validateDefinition({
        steps: input.steps ?? fromJson<WorkflowStepDef[]>(existing.stepsJson, []),
        transitions: input.transitions ?? fromJson<WorkflowTransition[]>(existing.transitionsJson, []),
        triggers: input.triggers ?? fromJson<WorkflowTrigger[]>(existing.triggersJson, []),
      });
      if (!validation.valid) {
        throw new ValidationError({ definition: validation.errors.join('; ') });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.steps) updateData.stepsJson = toJsonValue(input.steps);
    if (input.transitions) updateData.transitionsJson = toJsonValue(input.transitions);
    if (input.triggers) updateData.triggersJson = toJsonValue(input.triggers);
    if (input.variablesSchema !== undefined) updateData.variablesSchema = toJsonValue(input.variablesSchema);

    const updated = await db.workflowDefinition.update({
      where: { id },
      data: updateData,
    });

    log.info('Workflow definition updated', { id });
    return updated;
  },

  async getDefinition(id: string) {
    const def = await db.workflowDefinition.findUnique({ where: { id } });
    if (!def) throw new NotFoundError('WorkflowDefinition', id);
    return def;
  },

  async getDefinitionByKey(key: string) {
    const def = await db.workflowDefinition.findUnique({ where: { key } });
    if (!def) throw new NotFoundError('WorkflowDefinition', key);
    return def;
  },

  async listDefinitions(filter: {
    category?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, ...rest } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (rest.category) where.category = rest.category;
    if (rest.isActive !== undefined) where.isActive = rest.isActive;
    if (rest.search) {
      where.OR = [
        { name: { contains: rest.search, mode: 'insensitive' as const } },
        { key: { contains: rest.search, mode: 'insensitive' as const } },
      ];
    }

    const [data, total] = await Promise.all([
      db.workflowDefinition.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.workflowDefinition.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async deleteDefinition(id: string) {
    const def = await db.workflowDefinition.findUnique({ where: { id } });
    if (!def) throw new NotFoundError('WorkflowDefinition', id);
    if (def.isSystem) throw new ValidationError({ delete: 'System definitions cannot be deleted' });
    if (def.isActive) throw new ValidationError({ delete: 'Deactivate the definition before deleting' });

    const runningCount = await db.workflowInstance.count({
      where: { definitionId: id, status: { in: ['pending', 'running'] } },
    });
    if (runningCount > 0) {
      throw new ValidationError({ delete: `Cannot delete: ${runningCount} running instances exist` });
    }

    await db.workflowDefinition.delete({ where: { id } });
    log.info('Workflow definition deleted', { id });
  },

  // -------------------------------------------------------------------------
  // Versioning
  // -------------------------------------------------------------------------

  async createVersion(id: string, createdById: string) {
    const existing = await db.workflowDefinition.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('WorkflowDefinition', id);

    const newVersion = existing.version + 1;

    await db.workflowDefinition.update({
      where: { id },
      data: { isActive: false },
    });

    const newDef = await db.workflowDefinition.create({
      data: {
        name: existing.name,
        key: existing.key,
        version: newVersion,
        category: existing.category,
        description: existing.description,
        stepsJson: toJsonValue(existing.stepsJson),
        transitionsJson: toJsonValue(existing.transitionsJson),
        triggersJson: toJsonValue(existing.triggersJson),
        variablesSchema: toJsonValue(existing.variablesSchema),
        isActive: false,
        isSystem: existing.isSystem,
        createdById,
      },
    });

    log.info('Workflow version created', { key: existing.key, version: newVersion });
    return newDef;
  },

  // -------------------------------------------------------------------------
  // Activation
  // -------------------------------------------------------------------------

  async activateDefinition(id: string) {
    const def = await db.workflowDefinition.findUnique({ where: { id } });
    if (!def) throw new NotFoundError('WorkflowDefinition', id);

    const validation = validateDefinition({
      steps: fromJson<WorkflowStepDef[]>(def.stepsJson, []),
      transitions: fromJson<WorkflowTransition[]>(def.transitionsJson, []),
      triggers: fromJson<WorkflowTrigger[]>(def.triggersJson, []),
    });
    if (!validation.valid) {
      throw new ValidationError({ activation: validation.errors.join('; ') });
    }

    await db.workflowDefinition.updateMany({
      where: { key: def.key, id: { not: id } },
      data: { isActive: false },
    });

    const activated = await db.workflowDefinition.update({
      where: { id },
      data: { isActive: true },
    });

    log.info('Workflow definition activated', { id, key: def.key, version: def.version });
    return activated;
  },

  // -------------------------------------------------------------------------
  // Clone
  // -------------------------------------------------------------------------

  async cloneDefinition(id: string, name: string, key: string, createdById: string) {
    const source = await db.workflowDefinition.findUnique({ where: { id } });
    if (!source) throw new NotFoundError('WorkflowDefinition', id);

    const keyExists = await db.workflowDefinition.findUnique({ where: { key } });
    if (keyExists) throw new ConflictError('WorkflowDefinition', 'key', key);

    const cloned = await db.workflowDefinition.create({
      data: {
        name,
        key,
        version: 1,
        category: source.category,
        description: source.description,
        stepsJson: toJsonValue(source.stepsJson),
        transitionsJson: toJsonValue(source.transitionsJson),
        triggersJson: toJsonValue(source.triggersJson),
        variablesSchema: toJsonValue(source.variablesSchema),
        isActive: false,
        createdById,
      },
    });

    log.info('Workflow definition cloned', { sourceId: id, newId: cloned.id, newKey: key });
    return cloned;
  },

  // -------------------------------------------------------------------------
  // Import / Export
  // -------------------------------------------------------------------------

  async exportDefinition(id: string) {
    const def = await db.workflowDefinition.findUnique({ where: { id } });
    if (!def) throw new NotFoundError('WorkflowDefinition', id);

    return {
      schema: 'workflow_definition_v1',
      exportedAt: new Date().toISOString(),
      definition: {
        name: def.name,
        key: def.key,
        version: def.version,
        category: def.category,
        description: def.description,
        steps: def.stepsJson,
        transitions: def.transitionsJson,
        triggers: def.triggersJson,
        variablesSchema: def.variablesSchema,
      },
    };
  },

  async importDefinition(data: Record<string, unknown>, createdById: string) {
    if ((data.schema as string) !== 'workflow_definition_v1') {
      throw new ValidationError({ schema: 'Unsupported schema version' });
    }

    const def = data.definition as Record<string, unknown>;
    if (!def?.key || !def?.name) {
      throw new ValidationError({ import: 'Missing required fields: name, key' });
    }

    const importKey = `${def.key}_imported`;

    return this.createDefinition({
      name: String(def.name),
      key: importKey,
      category: def.category as string | undefined,
      description: def.description as string | undefined,
      steps: def.steps as WorkflowStepDef[] | undefined,
      transitions: def.transitions as WorkflowTransition[] | undefined,
      triggers: def.triggers as WorkflowTrigger[] | undefined,
      variablesSchema: def.variablesSchema as Record<string, unknown> | undefined,
      createdById,
    });
  },

  // -------------------------------------------------------------------------
  // Category Management
  // -------------------------------------------------------------------------

  getCategories() {
    return WORKFLOW_CATEGORIES.map((cat) => ({
      key: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
    }));
  },

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  validateDefinition(parts: {
    steps: WorkflowStepDef[];
    transitions: WorkflowTransition[];
    triggers: WorkflowTrigger[];
  }): ValidationResult {
    return validateDefinition(parts);
  },
};

// ---- Validation (module-level) ----

function validateDefinition(parts: {
  steps: WorkflowStepDef[];
  transitions: WorkflowTransition[];
  triggers: WorkflowTrigger[];
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { steps, transitions, triggers } = parts;

  const startSteps = steps.filter((s) => s.type === 'start');
  const endSteps = steps.filter((s) => s.type === 'end');

  if (startSteps.length === 0) errors.push('Missing start step');
  if (endSteps.length === 0) errors.push('Missing end step');
  if (startSteps.length > 1) errors.push('Multiple start steps found');
  if (endSteps.length > 1) warnings.push('Multiple end steps found');

  const stepIds = steps.map((s) => s.id);
  const duplicateIds = stepIds.filter((id, idx) => stepIds.indexOf(id) !== idx);
  if (duplicateIds.length > 0) errors.push(`Duplicate step IDs: ${[...new Set(duplicateIds)].join(', ')}`);

  for (const t of transitions) {
    if (!stepIds.includes(t.from)) errors.push(`Transition from unknown step: ${t.from}`);
    if (!stepIds.includes(t.to)) errors.push(`Transition to unknown step: ${t.to}`);
  }

  for (const s of steps) {
    if (s.type === 'fork' && (!s.parallelSteps || s.parallelSteps.length === 0)) {
      errors.push(`Fork step '${s.name}' must have parallelSteps defined`);
    }
    if (s.type === 'join' && !s.joinCondition) {
      warnings.push(`Join step '${s.name}' has no joinCondition (defaults to 'all')`);
    }
  }

  for (const s of steps) {
    if (s.type === 'approval') {
      if (!s.approvalType) errors.push(`Approval step '${s.name}' missing approvalType`);
      if (!s.assignee && (!s.approvers || s.approvers.length === 0)) {
        errors.push(`Approval step '${s.name}' missing assignee or approvers`);
      }
    }
  }

  for (const trigger of triggers) {
    if (!['entity_create', 'status_change', 'alarm', 'schedule'].includes(trigger.event)) {
      errors.push(`Invalid trigger event: ${trigger.event}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
