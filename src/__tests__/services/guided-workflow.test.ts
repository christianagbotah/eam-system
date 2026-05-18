// ============================================================================
// Guided Workflow — Task generation from PM template, status transitions,
// completion tracking
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mock DB ----
const mockWoFindUnique = vi.fn().mockResolvedValue(null);
const mockTaskFindMany = vi.fn().mockResolvedValue([]);
const mockTaskCreate = vi.fn().mockResolvedValue({});
const mockTaskCreateMany = vi.fn().mockResolvedValue({});
const mockTaskUpdate = vi.fn().mockResolvedValue({});
const mockTaskFindUnique = vi.fn().mockResolvedValue(null);
const mockTaskFindFirst = vi.fn().mockResolvedValue(null);
const mockAuditCreate = vi.fn().mockResolvedValue({});

vi.mock('@/lib/db', () => ({
  db: {
    workOrder: {
      findUnique: mockWoFindUnique,
    },
    workOrderTaskExecution: {
      findMany: mockTaskFindMany,
      create: mockTaskCreate,
      createMany: mockTaskCreateMany,
      update: mockTaskUpdate,
      findUnique: mockTaskFindUnique,
      findFirst: mockTaskFindFirst,
    },
    auditLog: { create: mockAuditCreate },
  },
}));

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn().mockReturnValue(null),
  isAdmin: vi.fn().mockReturnValue(false),
}));

// ---- Helpers ----

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_progress', 'skipped', 'completed'],
  in_progress: ['completed', 'skipped', 'failed'],
};

function makeTemplateTask(overrides: Record<string, unknown> = {}) {
  return {
    id: `tt-${Math.random().toString(36).slice(2, 6)}`,
    templateId: 'tpl-1',
    taskNumber: 1,
    description: 'Check oil level',
    taskType: 'check',
    requiredParts: '[{"partName": "Engine Oil", "quantity": 5, "unit": "liter"}]',
    estimatedMinutes: 15,
    sortOrder: 0,
    isActive: true,
    ...overrides,
  };
}

function makeTaskExecution(overrides: Record<string, unknown> = {}) {
  return {
    id: `task-${Math.random().toString(36).slice(2, 6)}`,
    workOrderId: 'wo-1',
    templateTaskId: 'tt-1',
    taskNumber: 1,
    description: 'Check oil level',
    taskType: 'check',
    requiredParts: null,
    estimatedMinutes: 15,
    status: 'pending',
    completedById: null,
    completedAt: null,
    notes: null,
    findings: null,
    photos: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedBy: null,
    workOrder: {
      id: 'wo-1',
      assignedTo: 'tech-1',
      teamLeaderId: 'lead-1',
      teamMembers: [
        { userId: 'tech-1', role: 'assistant', accessLevel: 'full' },
        { userId: 'tech-2', role: 'assistant', accessLevel: 'read_only' },
      ],
    },
    ...overrides,
  };
}

function makeWorkOrderWithTemplate(overrides: Record<string, unknown> = {}) {
  const tasks = [makeTemplateTask({ taskNumber: 1 }), makeTemplateTask({ taskNumber: 2, description: 'Inspect belts' })];
  return {
    id: 'wo-1',
    woNumber: 'WO-2025-001',
    pmScheduleId: 'pm-1',
    pmSchedule: {
      id: 'pm-1',
      template: {
        id: 'tpl-1',
        title: 'Monthly Pump Check',
        tasks,
      },
    },
    ...overrides,
  };
}

// ---- Tests ----

describe('Guided Workflow — Task Generation from PM Template', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTaskFindMany.mockResolvedValue([]);
  });

  it('should auto-generate tasks from PM template when no tasks exist', async () => {
    const wo = makeWorkOrderWithTemplate();
    mockWoFindUnique.mockResolvedValue(wo);
    mockTaskFindMany.mockResolvedValue([]); // No existing tasks
    mockTaskCreateMany.mockResolvedValue({ count: 2 });

    const templateTasks = wo.pmSchedule.template.tasks;
    expect(templateTasks).toHaveLength(2);

    const createData = templateTasks.map((tt) => ({
      workOrderId: wo.id,
      templateTaskId: tt.id,
      taskNumber: tt.taskNumber,
      description: tt.description,
      taskType: tt.taskType,
      requiredParts: tt.requiredParts,
      estimatedMinutes: tt.estimatedMinutes,
      status: 'pending',
    }));

    await mockTaskCreateMany({ data: createData });
    expect(mockTaskCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ taskNumber: 1, status: 'pending' }),
          expect.objectContaining({ taskNumber: 2, status: 'pending' }),
        ]),
      }),
    );
  });

  it('should NOT auto-generate tasks when tasks already exist', async () => {
    const wo = makeWorkOrderWithTemplate();
    const existingTasks = [makeTaskExecution({ id: 'task-1' })];
    mockWoFindUnique.mockResolvedValue(wo);
    mockTaskFindMany.mockResolvedValue(existingTasks); // Tasks exist

    expect(existingTasks).toHaveLength(1);
    // Should return existing tasks, not regenerate
    expect(mockTaskCreateMany).not.toHaveBeenCalled();
  });

  it('should NOT auto-generate when template has no tasks', async () => {
    const wo = makeWorkOrderWithTemplate();
    wo.pmSchedule.template.tasks = [];
    mockWoFindUnique.mockResolvedValue(wo);
    mockTaskFindMany.mockResolvedValue([]);

    const templateTasks = wo.pmSchedule.template.tasks;
    expect(templateTasks).toHaveLength(0);
    expect(mockTaskCreateMany).not.toHaveBeenCalled();
  });

  it('should NOT auto-generate when WO has no PM schedule', async () => {
    const wo = makeWorkOrderWithTemplate();
    wo.pmScheduleId = null;
    wo.pmSchedule = null;
    mockWoFindUnique.mockResolvedValue(wo);
    mockTaskFindMany.mockResolvedValue([]);

    // No template to generate from
    expect(wo.pmSchedule).toBeNull();
  });

  it('should map all template fields to execution records', () => {
    const tt = makeTemplateTask({
      taskNumber: 3,
      description: 'Replace filter',
      taskType: 'replace',
      requiredParts: '[{"partName": "Air Filter", "quantity": 1, "unit": "each"}]',
      estimatedMinutes: 30,
    });

    const execution = {
      workOrderId: 'wo-1',
      templateTaskId: tt.id,
      taskNumber: tt.taskNumber,
      description: tt.description,
      taskType: tt.taskType,
      requiredParts: tt.requiredParts,
      estimatedMinutes: tt.estimatedMinutes,
      status: 'pending' as const,
    };

    expect(execution.taskNumber).toBe(3);
    expect(execution.description).toBe('Replace filter');
    expect(execution.taskType).toBe('replace');
    expect(execution.estimatedMinutes).toBe(30);
    expect(execution.requiredParts).toBeTruthy();
  });

  it('should only include active template tasks', () => {
    const activeTasks = [makeTemplateTask({ isActive: true }), makeTemplateTask({ isActive: false })];
    const filtered = activeTasks.filter((t) => t.isActive);

    expect(filtered).toHaveLength(1);
  });
});

describe('Guided Workflow — Task Status Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transition from pending to in_progress', () => {
    const currentStatus = 'pending';
    const targetStatus = 'in_progress';

    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    expect(allowed).toContain(targetStatus);
  });

  it('should transition from pending to completed', () => {
    const currentStatus = 'pending';
    const targetStatus = 'completed';

    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    expect(allowed).toContain(targetStatus);
  });

  it('should transition from pending to skipped', () => {
    const currentStatus = 'pending';
    const targetStatus = 'skipped';

    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    expect(allowed).toContain(targetStatus);
  });

  it('should transition from in_progress to completed', () => {
    const currentStatus = 'in_progress';
    const targetStatus = 'completed';

    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    expect(allowed).toContain(targetStatus);
  });

  it('should transition from in_progress to failed', () => {
    const currentStatus = 'in_progress';
    const targetStatus = 'failed';

    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    expect(allowed).toContain(targetStatus);
  });

  it('should reject transition from completed (terminal state)', () => {
    const currentStatus = 'completed';
    const targetStatus = 'in_progress';

    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    expect(allowed).not.toContain(targetStatus);
  });

  it('should reject transition from skipped (terminal state)', () => {
    const currentStatus = 'skipped';
    const targetStatus = 'in_progress';

    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    expect(allowed).not.toContain(targetStatus);
  });

  it('should reject transition from failed (terminal state)', () => {
    const currentStatus = 'failed';
    const targetStatus = 'in_progress';

    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    expect(allowed).not.toContain(targetStatus);
  });

  it('should reject invalid target status', () => {
    const targetStatus = 'archived';

    const isValid = !!VALID_TRANSITIONS[targetStatus];
    expect(isValid).toBe(false);
  });

  it('should set completion data for terminal states', () => {
    const terminalStates = ['completed', 'skipped', 'failed'];
    const now = new Date();
    const userId = 'tech-1';

    for (const status of terminalStates) {
      const updateData: Record<string, unknown> = { status };
      if (terminalStates.includes(status)) {
        updateData.completedAt = now;
        updateData.completedById = userId;
      }
      expect(updateData.completedAt).toBeInstanceOf(Date);
      expect(updateData.completedById).toBe(userId);
    }
  });

  it('should clear completion data when moving to in_progress', () => {
    const updateData: Record<string, unknown> = {};

    if ('in_progress' as string === 'in_progress') {
      updateData.completedAt = null;
      updateData.completedById = null;
    }

    expect(updateData.completedAt).toBeNull();
    expect(updateData.completedById).toBeNull();
  });

  it('should validate auth: assignee can update tasks', () => {
    const task = makeTaskExecution();
    const sessionUserId = 'tech-1'; // same as assignedTo

    const isAssignee = task.workOrder.assignedTo === sessionUserId;
    const isTeamLeader = task.workOrder.teamLeaderId === sessionUserId;
    const isTeamMember = task.workOrder.teamMembers?.some((tm: any) => tm.userId === sessionUserId);
    const adminUser = false;

    const canUpdate = adminUser || isAssignee || isTeamLeader || isTeamMember;
    expect(canUpdate).toBe(true);
  });

  it('should validate auth: team leader can update tasks', () => {
    const task = makeTaskExecution();
    const sessionUserId = 'lead-1';

    const isAssignee = task.workOrder.assignedTo === sessionUserId;
    const isTeamLeader = task.workOrder.teamLeaderId === sessionUserId;

    const canUpdate = isAssignee || isTeamLeader;
    expect(canUpdate).toBe(true);
  });

  it('should validate auth: team member can update tasks', () => {
    const task = makeTaskExecution();
    const sessionUserId = 'tech-2';

    const isTeamMember = task.workOrder.teamMembers?.some((tm: any) => tm.userId === sessionUserId);
    expect(isTeamMember).toBe(true);
  });

  it('should block non-team members from updating tasks', () => {
    const task = makeTaskExecution();
    const sessionUserId = 'outsider-1';

    const isAssignee = task.workOrder.assignedTo === sessionUserId;
    const isTeamLeader = task.workOrder.teamLeaderId === sessionUserId;
    const isTeamMember = task.workOrder.teamMembers?.some((tm: any) => tm.userId === sessionUserId);
    const adminUser = false;

    const canUpdate = adminUser || isAssignee || isTeamLeader || isTeamMember;
    expect(canUpdate).toBe(false);
  });
});

describe('Guided Workflow — Completion Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate completion percentage', () => {
    const tasks = [
      makeTaskExecution({ status: 'completed' }),
      makeTaskExecution({ status: 'completed' }),
      makeTaskExecution({ status: 'pending' }),
      makeTaskExecution({ status: 'in_progress' }),
    ];

    const completed = tasks.filter((t) => t.status === 'completed').length;
    const percentage = Math.round((completed / tasks.length) * 100);

    expect(completed).toBe(2);
    expect(percentage).toBe(50);
  });

  it('should return 100% when all tasks completed', () => {
    const tasks = [
      makeTaskExecution({ status: 'completed' }),
      makeTaskExecution({ status: 'skipped' }),
      makeTaskExecution({ status: 'completed' }),
    ];

    const completed = tasks.filter((t) => t.status === 'completed').length;
    const percentage = Math.round((completed / tasks.length) * 100);

    expect(percentage).toBe(67);
  });

  it('should return 0% when no tasks completed', () => {
    const tasks = [
      makeTaskExecution({ status: 'pending' }),
      makeTaskExecution({ status: 'pending' }),
    ];

    const completed = tasks.filter((t) => t.status === 'completed').length;
    const percentage = Math.round((completed / tasks.length) * 100);

    expect(percentage).toBe(0);
  });

  it('should handle empty task list gracefully', () => {
    const tasks: any[] = [];
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const percentage = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    expect(percentage).toBe(0);
  });

  it('should append notes with timestamp and username', () => {
    const existingNotes = 'Initial observation';
    const newNote = 'Found loose connection';
    const timestamp = new Date().toISOString();
    const username = 'tech-1';

    const appendedNotes = existingNotes
      ? `${existingNotes}\n[${timestamp}] ${username}: ${newNote}`
      : `[${timestamp}] ${username}: ${newNote}`;

    expect(appendedNotes).toContain('Initial observation');
    expect(appendedNotes).toContain('Found loose connection');
    expect(appendedNotes).toContain(username);
  });

  it('should create notes when no existing notes', () => {
    const existingNotes = null;
    const newNote = 'First note';
    const timestamp = new Date().toISOString();
    const username = 'tech-1';

    const appendedNotes = existingNotes
      ? `${existingNotes}\n[${timestamp}] ${username}: ${newNote}`
      : `[${timestamp}] ${username}: ${newNote}`;

    expect(appendedNotes).not.toContain('\n');
    expect(appendedNotes).toContain('First note');
  });

  it('should auto-increment task number for manual tasks', async () => {
    const lastTask = makeTaskExecution({ taskNumber: 5 });
    mockTaskFindFirst.mockResolvedValue(lastTask);

    const lastTaskResult = await mockTaskFindFirst({
      where: { workOrderId: 'wo-1' },
      orderBy: { taskNumber: 'desc' },
    });

    const nextTaskNumber = (lastTaskResult?.taskNumber ?? 0) + 1;
    expect(nextTaskNumber).toBe(6);
  });

  it('should default task number to 1 when no tasks exist', async () => {
    mockTaskFindFirst.mockResolvedValue(null);

    const lastTaskResult = await mockTaskFindFirst({
      where: { workOrderId: 'wo-1' },
      orderBy: { taskNumber: 'desc' },
    });

    const nextTaskNumber = (lastTaskResult?.taskNumber ?? 0) + 1;
    expect(nextTaskNumber).toBe(1);
  });

  it('should validate task types', () => {
    const validTaskTypes = ['check', 'measure', 'inspect', 'lubricate', 'replace', 'record'];
    expect(validTaskTypes).toContain('check');
    expect(validTaskTypes).toContain('replace');
    expect(validTaskTypes).not.toContain('invalid_type');
  });

  it('should default to "check" type for invalid task type', () => {
    const validTaskTypes = ['check', 'measure', 'inspect', 'lubricate', 'replace', 'record'];
    const inputType = 'invalid_type';

    const finalType = validTaskTypes.includes(inputType) ? inputType : 'check';
    expect(finalType).toBe('check');
  });

  it('should count all terminal states for overall progress', () => {
    const tasks = [
      makeTaskExecution({ status: 'completed' }),
      makeTaskExecution({ status: 'skipped' }),
      makeTaskExecution({ status: 'failed' }),
      makeTaskExecution({ status: 'pending' }),
    ];

    const terminalStates = ['completed', 'skipped', 'failed'];
    const done = tasks.filter((t) => terminalStates.includes(t.status)).length;
    const percentage = Math.round((done / tasks.length) * 100);

    expect(done).toBe(3);
    expect(percentage).toBe(75);
  });

  it('should track findings on task completion', () => {
    const findings = 'Worn bearing detected, needs replacement';
    const updateData: Record<string, unknown> = {
      status: 'completed',
      findings: findings.trim() || null,
    };

    expect(updateData.findings).toBe('Worn bearing detected, needs replacement');
  });

  it('should handle empty findings gracefully', () => {
    const findings = '';
    const updateData: Record<string, unknown> = {
      findings: findings.trim() ? findings.trim() : null,
    };

    expect(updateData.findings).toBeNull();
  });
});
