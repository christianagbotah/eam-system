// ============================================================================
// Work Execution — Idempotency Tests (Step 13d)
// ============================================================================
// Tests that operations with idempotency keys:
//   1. Execute normally and record the key
//   2. Return stored response on repeat (no duplicate execution)
//   3. Different keys execute independently
//   4. No key provided → works normally (backward compatible)
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// ---- Hoisted mocks ----
const {
  mockDb,
  mockExecuteTransition,
  mockSendRepairNotification,
  mockCheckReadiness,
  mockNotifyUser,
  mockJobQueue,
} = vi.hoisted(() => ({
  mockDb: {
    $transaction: vi.fn(),
    workOrder: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    workOrderTimeLog: {
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    workOrderComment: {
      create: vi.fn(),
    },
    repairCompletion: {
      upsert: vi.fn(),
    },
    pmSchedule: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    failureRecord: {
      upsert: vi.fn(),
    },
    shiftHandover: {
      findFirst: vi.fn(),
    },
    idempotencyRecord: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
  mockExecuteTransition: vi.fn(),
  mockSendRepairNotification: vi.fn(),
  mockNotifyUser: vi.fn().mockResolvedValue(undefined),
  mockCheckReadiness: vi.fn(),
  mockJobQueue: {
    add: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/state-machine', () => ({ executeTransition: mockExecuteTransition }));
vi.mock('@/services/workOrderReadiness.service', () => ({ checkReadiness: mockCheckReadiness }));
vi.mock('@/lib/repair-notifications', () => ({ sendRepairNotification: mockSendRepairNotification }));
vi.mock('@/lib/notifications', () => ({ notifyUser: mockNotifyUser }));
vi.mock('@/lib/queue', () => ({ jobQueue: mockJobQueue, QUEUES: { NOTIFICATION: 'notifications' } }));
vi.mock('@/lib/audit-helpers', () => ({ buildAuditData: vi.fn().mockReturnValue({}) }));
vi.mock('@/lib/reliability-events', () => ({ emitReliabilityEvent: vi.fn() }));
vi.mock('@/lib/pm-utils', () => ({ calculateNextDueDate: vi.fn(), isAutoCalculableFrequency: vi.fn() }));

// ---- Import AFTER mocks ----
import { startWork, type SessionContext } from '@/services/workExecution.service';

// ---- Helpers ----

const techSession: SessionContext = {
  userId: 'tech-1',
  fullName: 'Tech One',
  roles: ['technician'],
  permissions: [],
};

function makeEnrichedWO() {
  return {
    id: 'wo-1',
    woNumber: 'WO-202506-0001',
    status: 'assigned',
    assignedTo: 'tech-1',
    teamLeaderId: null,
    assignedSupervisorId: 'sup-1',
    plannerId: 'planner-1',
    plantId: 'plant-1',
    assetId: 'asset-1',
    pmScheduleId: null,
    actualStart: null,
    actualHours: 0,
    laborCost: 0,
    partsCost: 0,
    contractorCost: 0,
    totalCost: 0,
    isLocked: false,
    failureDescription: null,
    causeDescription: null,
    actionDescription: null,
    downtimeMinutes: 0,
    maintenanceRequest: { id: 'mr-1', requestNumber: 'MR-001', title: 'Fix pump', requestedBy: 'user-1' },
    assignee: { id: 'tech-1', fullName: 'Tech One', username: 'tech1', primaryTrade: 'mechanical' },
    teamLeader: null,
    assignedSupervisor: { id: 'sup-1', fullName: 'Sup One', username: 'sup1' },
    planner: { id: 'planner-1', fullName: 'Planner One', username: 'planner1' },
    teamMembers: [],
    repairCompletion: null,
    repairToolRequests: [],
    repairMaterialRequests: [],
    timeLogs: [],
    shiftHandovers: [],
  };
}

function mockTransactionExec() {
  const tx = {
    workOrder: {
      findUnique: mockDb.workOrder.findUnique,
      update: vi.fn().mockResolvedValue({}),
    },
    workOrderTimeLog: {
      updateMany: mockDb.workOrderTimeLog.updateMany,
      create: vi.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    workOrderComment: {
      create: vi.fn().mockResolvedValue({}),
    },
    repairCompletion: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    pmSchedule: {
      findUnique: mockDb.pmSchedule.findUnique,
      update: vi.fn().mockResolvedValue({}),
    },
    failureRecord: {
      upsert: mockDb.failureRecord.upsert,
    },
    shiftHandover: {
      findFirst: mockDb.shiftHandover.findFirst,
    },
    laborRate: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    trade: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
  (mockDb.$transaction as Mock).mockImplementation(async (cb: (t: any) => Promise<any>) => cb(tx)); // eslint-disable-line @typescript-eslint/no-explicit-any
  return tx;
}

function setupSuccessfulStart() {
  mockDb.workOrder.findUnique.mockResolvedValue(makeEnrichedWO());
  mockCheckReadiness.mockResolvedValue({ ready: true, blockers: [], warnings: [] });
  mockExecuteTransition.mockResolvedValue({ success: true });
  mockDb.workOrderTimeLog.create.mockResolvedValue({});
  mockDb.auditLog.create.mockResolvedValue({});
  mockDb.idempotencyRecord.findUnique.mockResolvedValue(null);
  mockDb.idempotencyRecord.create.mockResolvedValue({});
  mockTransactionExec();
}

// ============================================================================

describe('Work Execution — Idempotency (Step 8)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // Test 1: New idempotency key executes normally and records the key
  it('should execute normally and record the idempotency key', async () => {
    setupSuccessfulStart();

    const result = await startWork('wo-1', techSession, {
      idempotencyKey: 'idem-new-key-001',
    });

    expect(result.success).toBe(true);
    // Should check for existing key first
    expect(mockDb.idempotencyRecord.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'idem-new-key-001' } }),
    );
    // Should record the result after success
    expect(mockDb.idempotencyRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'idem-new-key-001',
          entityType: 'work_order',
          entityId: 'wo-1',
          action: 'start',
          userId: 'tech-1',
        }),
      }),
    );
  });

  // Test 2: Repeating the same idempotency key returns stored response
  it('should return stored response on duplicate idempotency key', async () => {
    const storedResponse = { success: true, data: { status: 'in_progress' } };
    mockDb.idempotencyRecord.findUnique.mockResolvedValue({
      key: 'idem-dup-key-001',
      responseData: JSON.stringify(storedResponse),
    });

    const result = await startWork('wo-1', techSession, {
      idempotencyKey: 'idem-dup-key-001',
    });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('in_progress');
    // Should NOT have called readiness, transition, or time log create
    expect(mockCheckReadiness).not.toHaveBeenCalled();
    expect(mockExecuteTransition).not.toHaveBeenCalled();
    expect(mockDb.workOrderTimeLog.create).not.toHaveBeenCalled();
  });

  // Test 3: Different idempotency keys execute independently
  it('should execute independently for different idempotency keys', async () => {
    setupSuccessfulStart();

    const result1 = await startWork('wo-1', techSession, {
      idempotencyKey: 'idem-key-alpha',
    });

    // Reset mocks after first call, re-setup for second
    vi.clearAllMocks();
    setupSuccessfulStart();

    const result2 = await startWork('wo-1', techSession, {
      idempotencyKey: 'idem-key-beta',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    // Second call checked with the new key
    expect(mockDb.idempotencyRecord.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'idem-key-beta' } }),
    );
  });

  // Test 4: No idempotency key → works normally (backward compatible)
  it('should work normally without an idempotency key', async () => {
    setupSuccessfulStart();

    const result = await startWork('wo-1', techSession, { reason: 'Starting work' });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('in_progress');
    // Should NOT have checked or recorded idempotency
    expect(mockDb.idempotencyRecord.findUnique).not.toHaveBeenCalled();
    expect(mockDb.idempotencyRecord.create).not.toHaveBeenCalled();
    // But should have done normal execution (readiness, transition, time log created via tx)
    expect(mockCheckReadiness).toHaveBeenCalled();
    expect(mockExecuteTransition).toHaveBeenCalled();
    // Time log is created via tx inside the transaction, not on mockDb directly
    // Verify the transaction was invoked
    expect(mockDb.$transaction).toHaveBeenCalled();
  });

  // Edge: idempotency record found but no stored response
  it('should execute normally when idempotency record exists but has no response data', async () => {
    setupSuccessfulStart();
    // findUnique returns a record but responseData is null
    mockDb.idempotencyRecord.findUnique.mockResolvedValue({
      key: 'idem-no-data',
      responseData: null,
    });

    const result = await startWork('wo-1', techSession, {
      idempotencyKey: 'idem-no-data',
    });

    // Should proceed with normal execution since no cached response
    expect(result.success).toBe(true);
    expect(mockCheckReadiness).toHaveBeenCalled();
    expect(mockExecuteTransition).toHaveBeenCalled();
  });
});
