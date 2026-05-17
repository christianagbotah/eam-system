// ============================================================================
// Workflow Engine Service — Critical Workflow Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors';

// ---- Use vi.hoisted to define mocks available inside hoisted vi.mock factory ----
const { mockDefinitionFindUnique, mockInstanceFindUnique, mockInstanceFindFirst,
        mockInstanceCreate, mockInstanceUpdate, mockInstanceFindMany, mockInstanceCount,
        mockStepHistoryCreate, mockStepHistoryFindFirst, mockStepHistoryFindMany,
        mockDefinitionFindMany, mockNotificationCreate } = vi.hoisted(() => ({
  mockDefinitionFindUnique: vi.fn(),
  mockInstanceFindUnique: vi.fn(),
  mockInstanceFindFirst: vi.fn(),
  mockInstanceCreate: vi.fn(),
  mockInstanceUpdate: vi.fn(),
  mockInstanceFindMany: vi.fn(),
  mockInstanceCount: vi.fn(),
  mockStepHistoryCreate: vi.fn().mockResolvedValue({}),
  mockStepHistoryFindFirst: vi.fn(),
  mockStepHistoryFindMany: vi.fn().mockResolvedValue([]),
  mockDefinitionFindMany: vi.fn(),
  mockNotificationCreate: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/db', () => ({
  db: {
    workflowDefinition: {
      findUnique: mockDefinitionFindUnique,
      findMany: mockDefinitionFindMany,
    },
    workflowInstance: {
      findUnique: mockInstanceFindUnique,
      findFirst: mockInstanceFindFirst,
      create: mockInstanceCreate,
      update: mockInstanceUpdate,
      findMany: mockInstanceFindMany,
      count: mockInstanceCount,
    },
    workflowStepHistory: {
      create: mockStepHistoryCreate,
      findFirst: mockStepHistoryFindFirst,
      findMany: mockStepHistoryFindMany,
    },
    notification: { create: mockNotificationCreate },
    workOrder: { update: vi.fn().mockResolvedValue({}) },
  },
}));

// ---- Import after mocking ----
import { WorkflowEngineService } from '@/services/workflow/engine.service';

// ---- Test fixtures ----
const STEPS = [
  { id: 'start', name: 'Start', type: 'start' as const },
  { id: 'review', name: 'Manager Review', type: 'approval' as const, assignee: 'manager-1' },
  { id: 'end', name: 'End', type: 'end' as const },
];

const TRANSITIONS = [
  { from: 'start', to: 'review' },
  { from: 'review', to: 'end' },
];

function makeDefinition(overrides: Record<string, unknown> = {}) {
  return {
    id: 'def-1',
    key: 'test-workflow',
    name: 'Test Workflow',
    isActive: true,
    stepsJson: JSON.stringify(STEPS),
    transitionsJson: JSON.stringify(TRANSITIONS),
    triggersJson: JSON.stringify([]),
    ...overrides,
  };
}

function makeInstance(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inst-1',
    definitionId: 'def-1',
    entityType: 'work_order',
    entityId: 'wo-1',
    currentStepId: 'start',
    status: 'running',
    variables: JSON.stringify({}),
    startedAt: new Date(),
    completedAt: null,
    startedById: 'user-1',
    completedById: null,
    cancelledAt: null,
    cancelledById: null,
    errorDetail: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    definition: makeDefinition(),
    stepHistory: [],
    ...overrides,
  };
}

describe('WorkflowEngineService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStepHistoryCreate.mockResolvedValue({});
    mockStepHistoryFindMany.mockResolvedValue([]);
  });

  // -------------------------------------------------------------------------
  // Test 1: Starting a workflow creates an instance
  // -------------------------------------------------------------------------
  it('should create a workflow instance when started', async () => {
    mockDefinitionFindUnique.mockResolvedValue(makeDefinition());
    mockInstanceFindFirst.mockResolvedValue(null);
    mockInstanceCreate.mockResolvedValue(makeInstance({ id: 'new-inst', currentStepId: 'start' }));

    await WorkflowEngineService.startWorkflow({
      definitionId: 'def-1',
      entityType: 'work_order',
      entityId: 'wo-1',
      variables: { priority: 'high' },
      startedById: 'user-1',
    });

    expect(mockInstanceCreate).toHaveBeenCalledTimes(1);
    const createData = mockInstanceCreate.mock.calls[0][0].data;
    expect(createData.definitionId).toBe('def-1');
    expect(createData.status).toBe('running');
    expect(createData.currentStepId).toBe('start');
    expect(createData.startedById).toBe('user-1');
    expect(createData.variables.priority).toBe('high');

    // Should also create step history
    expect(mockStepHistoryCreate).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 2: Start workflow throws for missing definition
  // -------------------------------------------------------------------------
  it('should throw NotFoundError when definition not found', async () => {
    mockDefinitionFindUnique.mockResolvedValue(null);

    await expect(
      WorkflowEngineService.startWorkflow({
        definitionId: 'nonexistent',
        entityType: 'work_order',
        entityId: 'wo-1',
        startedById: 'user-1',
      }),
    ).rejects.toThrow(NotFoundError);
  });

  // -------------------------------------------------------------------------
  // Test 3: Start workflow throws for inactive definition
  // -------------------------------------------------------------------------
  it('should throw ValidationError for inactive definition', async () => {
    mockDefinitionFindUnique.mockResolvedValue(makeDefinition({ isActive: false }));

    await expect(
      WorkflowEngineService.startWorkflow({
        definitionId: 'def-1',
        entityType: 'work_order',
        entityId: 'wo-1',
        startedById: 'user-1',
      }),
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------------
  // Test 4: Advancing workflow moves to next step
  // -------------------------------------------------------------------------
  it('should advance workflow to next step on complete action', async () => {
    const instance = makeInstance({ currentStepId: 'start' });
    mockInstanceFindUnique.mockResolvedValue(instance);
    mockStepHistoryFindFirst.mockResolvedValue(null);
    mockInstanceUpdate.mockImplementation(async (_where: unknown, data: Record<string, unknown>) => {
      return { ...instance, ...data };
    });

    await WorkflowEngineService.advanceWorkflow('inst-1', {
      stepId: 'start',
      action: 'complete',
      performedById: 'user-1',
    });

    expect(mockInstanceUpdate).toHaveBeenCalled();
    const updateData = mockInstanceUpdate.mock.calls[0][1];
    expect(updateData.currentStepId).toBe('review');
  });

  // -------------------------------------------------------------------------
  // Test 5: Rejection stops the workflow
  // -------------------------------------------------------------------------
  it('should stop workflow on reject action', async () => {
    const instance = makeInstance({ currentStepId: 'review' });
    mockInstanceFindUnique.mockResolvedValue(instance);
    mockStepHistoryFindFirst.mockResolvedValue(null);
    mockInstanceUpdate.mockImplementation(async (_where: unknown, data: Record<string, unknown>) => {
      return { ...instance, ...data };
    });

    await WorkflowEngineService.advanceWorkflow('inst-1', {
      stepId: 'review',
      action: 'reject',
      performedById: 'manager-1',
      comment: 'Does not meet requirements',
    });

    const updateData = mockInstanceUpdate.mock.calls[0][1];
    expect(updateData.status).toBe('failed');
    expect(updateData.errorDetail).toContain('Rejected');
  });

  // -------------------------------------------------------------------------
  // Test 6: Suspension and resumption
  // -------------------------------------------------------------------------
  it('should suspend and resume a running workflow', async () => {
    const runningInstance = makeInstance({ status: 'running' });
    const suspendedInstance = { ...runningInstance, status: 'suspended' };
    const resumedInstance = { ...runningInstance, status: 'running' };

    // Suspend
    mockInstanceFindUnique.mockResolvedValueOnce(runningInstance);
    mockInstanceUpdate.mockResolvedValueOnce(suspendedInstance);
    await WorkflowEngineService.suspendWorkflow('inst-1', 'user-1', 'reason');
    expect(mockInstanceUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'suspended' }),
    );

    // Resume
    mockInstanceFindUnique.mockResolvedValueOnce(suspendedInstance);
    mockInstanceUpdate.mockResolvedValueOnce(resumedInstance);
    await WorkflowEngineService.resumeWorkflow('inst-1', 'user-1');
    expect(mockInstanceUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'running' }),
    );
  });

  // -------------------------------------------------------------------------
  // Test 7: Cancellation
  // -------------------------------------------------------------------------
  it('should cancel a running workflow', async () => {
    const instance = makeInstance({ status: 'running' });
    mockInstanceFindUnique.mockResolvedValue(instance);
    mockInstanceUpdate.mockResolvedValue({ ...instance, status: 'cancelled' });

    await WorkflowEngineService.cancelWorkflow('inst-1', 'admin-1', 'No longer needed');

    expect(mockInstanceUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'cancelled',
        cancelledById: 'admin-1',
        errorDetail: 'No longer needed',
      }),
    );
  });

  // -------------------------------------------------------------------------
  // Test 8: Cannot cancel completed workflow
  // -------------------------------------------------------------------------
  it('should throw when trying to cancel a completed workflow', async () => {
    const instance = makeInstance({ status: 'completed' });
    mockInstanceFindUnique.mockResolvedValue(instance);

    await expect(
      WorkflowEngineService.cancelWorkflow('inst-1', 'admin-1'),
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------------
  // Test 9: Trigger evaluation
  // -------------------------------------------------------------------------
  it('should evaluate triggers and return matching definitions', async () => {
    const def1 = makeDefinition({
      id: 'def-1',
      key: 'wo-approval',
      triggersJson: JSON.stringify([
        { event: 'entity_create', entityType: 'work_order', config: {} },
      ]),
    });
    const def2 = makeDefinition({
      id: 'def-2',
      key: 'safety-permit',
      triggersJson: JSON.stringify([
        { event: 'status_change', entityType: 'safety_permit', config: {} },
      ]),
    });

    mockDefinitionFindMany.mockResolvedValue([def1, def2]);

    const matched = await WorkflowEngineService.evaluateTriggers('entity_create', 'work_order');

    expect(matched).toHaveLength(1);
    expect(matched[0].definitionId).toBe('def-1');
    expect(matched[0].trigger.event).toBe('entity_create');
  });

  // -------------------------------------------------------------------------
  // Test 10: Trigger evaluation with no entity type filter
  // -------------------------------------------------------------------------
  it('should match triggers without entity type filter', async () => {
    const def1 = makeDefinition({
      id: 'def-1',
      key: 'alarm-trigger',
      triggersJson: JSON.stringify([
        { event: 'alarm', config: {} },
      ]),
    });

    mockDefinitionFindMany.mockResolvedValue([def1]);

    const matched = await WorkflowEngineService.evaluateTriggers('alarm');

    expect(matched).toHaveLength(1);
    expect(matched[0].trigger.event).toBe('alarm');
  });

  // -------------------------------------------------------------------------
  // Test 11: Stuck workflow detection
  // -------------------------------------------------------------------------
  it('should detect workflows stuck for too long', async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 10);

    const stuckInstance = makeInstance({
      id: 'stuck-1',
      updatedAt: cutoffDate,
      status: 'running',
    });

    mockInstanceFindMany.mockResolvedValue([stuckInstance]);

    const stuck = await WorkflowEngineService.detectStuckWorkflows(7);

    expect(mockInstanceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'running',
        }),
      }),
    );
    expect(stuck).toHaveLength(1);
    expect(stuck[0].id).toBe('stuck-1');
  });

  // -------------------------------------------------------------------------
  // Test 12: Advance on completed instance should fail
  // -------------------------------------------------------------------------
  it('should throw ValidationError when advancing a non-running instance', async () => {
    const completedInstance = makeInstance({ status: 'completed' });
    mockInstanceFindUnique.mockResolvedValue(completedInstance);

    await expect(
      WorkflowEngineService.advanceWorkflow('inst-1', {
        stepId: 'review',
        action: 'complete',
        performedById: 'user-1',
      }),
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------------
  // Test 13: Advance completes workflow when reaching end step
  // -------------------------------------------------------------------------
  it('should complete workflow when reaching end step', async () => {
    const instance = makeInstance({ currentStepId: 'review' });
    mockInstanceFindUnique.mockResolvedValue(instance);
    mockStepHistoryFindFirst.mockResolvedValue(null);
    mockInstanceUpdate.mockImplementation(async (_where: unknown, data: Record<string, unknown>) => {
      return { ...instance, ...data };
    });

    await WorkflowEngineService.advanceWorkflow('inst-1', {
      stepId: 'review',
      action: 'approve',
      performedById: 'manager-1',
    });

    // Should have moved to 'end' step and completed
    const calls = mockInstanceUpdate.mock.calls;
    const completeCall = calls.find(
      (call: unknown[]) => call[1]?.status === 'completed',
    );
    expect(completeCall).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Test 14: Cannot suspend a non-running workflow
  // -------------------------------------------------------------------------
  it('should throw when suspending a non-running workflow', async () => {
    const suspendedInstance = makeInstance({ status: 'suspended' });
    mockInstanceFindUnique.mockResolvedValue(suspendedInstance);

    await expect(
      WorkflowEngineService.suspendWorkflow('inst-1', 'user-1'),
    ).rejects.toThrow(ValidationError);
  });

  // -------------------------------------------------------------------------
  // Test 15: Conflict when workflow already exists for entity
  // -------------------------------------------------------------------------
  it('should throw ConflictError when workflow already exists for entity', async () => {
    mockDefinitionFindUnique.mockResolvedValue(makeDefinition());
    mockInstanceFindFirst.mockResolvedValue(makeInstance({ id: 'existing-inst' }));

    await expect(
      WorkflowEngineService.startWorkflow({
        definitionId: 'def-1',
        entityType: 'work_order',
        entityId: 'wo-1',
        startedById: 'user-1',
      }),
    ).rejects.toThrow(ConflictError);
  });
});
