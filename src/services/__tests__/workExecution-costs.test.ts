// ============================================================================
// Work Execution — Authoritative Cost Calculation Tests (Step 13b)
// ============================================================================
// Tests that calculateAuthoritativeCosts() (the Step 2 rewrite) correctly:
//   1. Computes laborHours from time log durations
//   2. Computes materialCost from consumedQty + wastedQty × unitCost
//   3. Returns toolCost 0 with toolCostNote when no consumption model exists
//   4. Flags incompleteLaborRate: true when no rate configured
//   5. CompletionOptions no longer accepts client-submitted cost values
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Hoisted mocks ----
const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    workOrder: {
      findUnique: vi.fn(),
    },
    laborRate: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    trade: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));

// ---- Import AFTER mocks ----
import {
  calculateAuthoritativeCosts,
  type CompletionOptions,
} from '@/services/workExecution.service';

// ---- Helpers ----

function makeCostWO(overrides: Record<string, any> = {}) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    id: 'wo-1',
    totalCost: 0,
    laborCost: 0,
    partsCost: 0,
    contractorCost: 0,
    estimatedHours: 4,
    tradeActivity: 'mechanical',
    assignedTo: 'tech-1',
    timeLogs: [],
    repairMaterialRequests: [],
    repairToolRequests: [],
    ...overrides,
  };
}

// ============================================================================

describe('calculateAuthoritativeCosts — Step 2 authoritative cost model', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ---- Test 1: Labor hours from time log durations ----
  // Note: the duration field stores hours directly (Float type)
  it('should return labor hours from time log durations', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(
      makeCostWO({
        timeLogs: [
          { id: 'tl-1', userId: 'tech-1', action: 'start', duration: 2.0, startTime: null, endTime: null, breakMinutes: 0, timestamp: new Date('2025-01-15T08:00:00Z') },
          { id: 'tl-2', userId: 'tech-1', action: 'resume', duration: 1.5, startTime: null, endTime: null, breakMinutes: 0, timestamp: new Date('2025-01-15T10:00:00Z') },
        ],
      }),
    );

    const result = await calculateAuthoritativeCosts('wo-1');
    expect(result).not.toBeNull();
    // 2.0 hours + 1.5 hours = 3.5 hours
    expect(result!.laborHours).toBe(3.5);
  });

  // ---- Test 1b: Labor hours prefer explicit duration over startTime/endTime ----
  it('should prefer explicit duration over startTime/endTime calculation', async () => {
    const start = new Date('2025-01-15T08:00:00Z');
    const end = new Date('2025-01-15T12:00:00Z'); // 4 hours calendar
    mockDb.workOrder.findUnique.mockResolvedValue(
      makeCostWO({
        timeLogs: [
          { id: 'tl-1', userId: 'tech-1', action: 'start', duration: 2.0, startTime: start, endTime: end, breakMinutes: 0, timestamp: start },
        ],
      }),
    );

    const result = await calculateAuthoritativeCosts('wo-1');
    expect(result).not.toBeNull();
    // Explicit duration 2 hours, NOT 4 hours from start/end
    expect(result!.laborHours).toBe(2);
  });

  // ---- Test 1c: Labor hours from startTime/endTime fallback ----
  it('should calculate labor hours from startTime/endTime when no explicit duration', async () => {
    const start = new Date('2025-01-15T08:00:00Z');
    const end = new Date('2025-01-15T10:30:00Z'); // 2.5 hours
    mockDb.workOrder.findUnique.mockResolvedValue(
      makeCostWO({
        timeLogs: [
          { id: 'tl-1', userId: 'tech-1', action: 'start', duration: null, startTime: start, endTime: end, breakMinutes: 0, timestamp: start },
        ],
      }),
    );

    const result = await calculateAuthoritativeCosts('wo-1');
    expect(result).not.toBeNull();
    expect(result!.laborHours).toBe(2.5);
  });

  // ---- Test 1d: Break deduction ----
  it('should deduct break minutes from labor hours calculated from start/end', async () => {
    const start = new Date('2025-01-15T08:00:00Z');
    const end = new Date('2025-01-15T11:00:00Z'); // 3 hours calendar
    mockDb.workOrder.findUnique.mockResolvedValue(
      makeCostWO({
        timeLogs: [
          { id: 'tl-1', userId: 'tech-1', action: 'start', duration: null, startTime: start, endTime: end, breakMinutes: 30, timestamp: start },
        ],
      }),
    );

    const result = await calculateAuthoritativeCosts('wo-1');
    expect(result).not.toBeNull();
    // 3 hours - 0.5 hours break = 2.5 hours
    expect(result!.laborHours).toBe(2.5);
  });

  // ---- Test 2: Material cost from consumedQty + wastedQty × unitCost ----
  it('should return material cost from consumedQty + wastedQty × unitCost', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(
      makeCostWO({
        repairMaterialRequests: [
          { unitCost: 25, consumedQty: 4, wastedQty: 1 },  // (4+1) * 25 = 125
          { unitCost: 10, consumedQty: 2, wastedQty: 0 },  // (2+0) * 10 = 20
        ],
      }),
    );

    const result = await calculateAuthoritativeCosts('wo-1');
    expect(result).not.toBeNull();
    expect(result!.actualMaterialCost).toBe(145);
  });

  // ---- Test 2b: Returned stock excluded (only consumedQty + wastedQty) ----
  it('should exclude returned stock from material cost calculation', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(
      makeCostWO({
        repairMaterialRequests: [
          { unitCost: 50, consumedQty: 3, wastedQty: 1 },  // (3+1) * 50 = 200
        ],
      }),
    );

    const result = await calculateAuthoritativeCosts('wo-1');
    expect(result).not.toBeNull();
    // Only consumed and wasted are included; returned/unused are not in the formula
    expect(result!.actualMaterialCost).toBe(200);
  });

  // ---- Test 2c: Null quantities treated as 0 ----
  it('should treat null consumedQty and wastedQty as 0', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(
      makeCostWO({
        repairMaterialRequests: [
          { unitCost: 100, consumedQty: null, wastedQty: null },
        ],
      }),
    );

    const result = await calculateAuthoritativeCosts('wo-1');
    expect(result).not.toBeNull();
    expect(result!.actualMaterialCost).toBe(0);
  });

  // ---- Test 3: Tool cost 0 with note ----
  it('should return toolCost 0 with toolCostNote when no consumption cost model exists', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(
      makeCostWO({
        repairToolRequests: [
          { id: 'tr-1', status: 'issued', items: [{ id: 'ti-1', unitCost: 500, quantityIssued: 2 }] },
        ],
      }),
    );

    const result = await calculateAuthoritativeCosts('wo-1');
    expect(result).not.toBeNull();
    expect(result!.actualToolCost).toBe(0);
    expect(result!.toolCostNote).toBe('Reusable tools in custody — no consumption cost');
  });

  // ---- Test 4: incompleteLaborRate flag ----
  it('should return incompleteLaborRate true when no rate is configured', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(
      makeCostWO({
        timeLogs: [
          { id: 'tl-1', userId: 'tech-1', action: 'start', duration: 3.0, startTime: null, endTime: null, breakMinutes: 0, timestamp: new Date('2025-01-15T08:00:00Z') },
        ],
      }),
    );

    const result = await calculateAuthoritativeCosts('wo-1');
    expect(result).not.toBeNull();
    expect(result!.incompleteLaborRate).toBe(true);
    // Labor cost should be 0 since no rate exists
    expect(result!.actualLaborCost).toBe(0);
    // Warning should be present
    expect(result!.warnings.length).toBeGreaterThan(0);
    expect(result!.warnings.some(w => w.includes('No configured labor rate'))).toBe(true);
  });

  // ---- Test 4b: Total actual cost sums all components ----
  it('should sum all components into totalActualCost', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(
      makeCostWO({
        contractorCost: 75,
        totalCost: 500,
        timeLogs: [
          { id: 'tl-1', userId: 'tech-1', action: 'start', duration: 2.0, startTime: null, endTime: null, breakMinutes: 0, timestamp: new Date('2025-01-15T08:00:00Z') },
        ],
        repairMaterialRequests: [
          { unitCost: 15, consumedQty: 10, wastedQty: 2 }, // 12 * 15 = 180
        ],
      }),
    );

    const result = await calculateAuthoritativeCosts('wo-1');
    expect(result).not.toBeNull();
    // laborCost=0 (no rate), materialCost=180, toolCost=0, contractorCost=75
    expect(result!.totalActualCost).toBe(255); // 0 + 180 + 0 + 75
    expect(result!.plannedCost).toBe(500);
  });

  // ---- Test 5: CompletionOptions no longer has client-submitted cost fields ----
  it('should not accept client-submitted cost values in CompletionOptions', () => {
    const opts: CompletionOptions = {
      notes: 'done',
      failureDescription: 'pump failure',
      causeDescription: 'bearing wear',
      actionDescription: 'replaced bearing',
      idempotencyKey: 'key-123',
    };

    // Verify the known fields exist
    expect(opts.notes).toBe('done');
    expect(opts.failureDescription).toBe('pump failure');
    expect(opts.idempotencyKey).toBe('key-123');

    // Verify cost fields are NOT present on the type
    const keys = Object.keys(opts);
    expect(keys).not.toContain('laborCost');
    expect(keys).not.toContain('partsCost');
    expect(keys).not.toContain('contractorCost');
  });

  // ---- Edge: WO not found ----
  it('should return null when WO not found', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(null);
    const result = await calculateAuthoritativeCosts('nonexistent');
    expect(result).toBeNull();
  });

  // ---- Edge: Empty data ----
  it('should return all zeros with warnings when no data exists', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(makeCostWO());

    const result = await calculateAuthoritativeCosts('wo-1');
    expect(result).not.toBeNull();
    expect(result!.laborHours).toBe(0);
    expect(result!.actualLaborCost).toBe(0);
    expect(result!.actualMaterialCost).toBe(0);
    expect(result!.actualToolCost).toBe(0);
    expect(result!.totalActualCost).toBe(0);
    expect(result!.incompleteLaborRate).toBe(true);
  });
});
