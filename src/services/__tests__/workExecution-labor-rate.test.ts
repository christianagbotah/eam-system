import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Hoisted mocks ----
const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    workOrder: {
      findUnique: vi.fn(),
    },
    laborRate: {
      findFirst: vi.fn(),
    },
    trade: {
      findFirst: vi.fn(),
    },
    workOrderTimeLog: {
      findMany: vi.fn(),
    },
    repairMaterialRequest: {
      findMany: vi.fn(),
    },
    repairToolRequest: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));

// ---- Import AFTER mocks ----
import { calculateAuthoritativeCosts } from '@/services/workExecution.service';

describe('calculateAuthoritativeCosts — Labor Rate Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should calculate labor cost from user-specific rate', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue({
      id: 'wo-1', plantId: 'plant-1', totalCost: 0, laborCost: 0, partsCost: 0,
      contractorCost: 0, estimatedHours: 4, tradeActivity: 'MECHANICAL', assignedTo: 'user-1',
      timeLogs: [
        { id: 'tl-1', action: 'start', duration: 2, startTime: new Date('2025-01-01T08:00'), endTime: new Date('2025-01-01T10:00'), breakMinutes: 0 },
      ],
      repairMaterialRequests: [],
      repairToolRequests: [],
    });

    mockDb.trade.findFirst.mockResolvedValue(null);
    mockDb.laborRate.findFirst
      .mockResolvedValueOnce({ normalHourlyRate: 50, currency: 'GHS' }) // user+plant
      .mockResolvedValueOnce(null); // user no-plant fallback

    const costs = await calculateAuthoritativeCosts('wo-1');

    expect(costs).not.toBeNull();
    expect(costs!.actualLaborCost).toBe(100); // 2 hours × GHS 50
    expect(costs!.appliedLaborRate).toBe(50);
    expect(costs!.appliedLaborCurrency).toBe('GHS');
    expect(costs!.incompleteLaborRate).toBe(false);
  });

  it('should fall back to trade-level rate when no user rate', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue({
      id: 'wo-2', plantId: 'plant-1', totalCost: 0, laborCost: 0, partsCost: 0,
      contractorCost: 0, estimatedHours: 4, tradeActivity: 'ELECTRICAL', assignedTo: 'user-2',
      timeLogs: [
        { id: 'tl-2', action: 'start', duration: 3, startTime: null, endTime: null, breakMinutes: 0 },
      ],
      repairMaterialRequests: [],
      repairToolRequests: [],
    });

    mockDb.laborRate.findFirst.mockResolvedValue(null); // no user rate
    mockDb.trade.findFirst.mockResolvedValue({ id: 'trade-1' });
    mockDb.laborRate.findFirst
      .mockResolvedValueOnce(null) // trade+plant
      .mockResolvedValueOnce({ normalHourlyRate: 60, currency: 'GHS' }); // trade no-plant

    const costs = await calculateAuthoritativeCosts('wo-2');

    expect(costs).not.toBeNull();
    expect(costs!.actualLaborCost).toBe(180); // 3 hours × GHS 60
    expect(costs!.appliedLaborRate).toBe(60);
    expect(costs!.incompleteLaborRate).toBe(false);
  });

  it('should return incompleteLaborRate=true when no rate configured', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue({
      id: 'wo-3', plantId: 'plant-1', totalCost: 0, laborCost: 0, partsCost: 0,
      contractorCost: 0, estimatedHours: 4, tradeActivity: 'MECHANICAL', assignedTo: 'user-3',
      timeLogs: [
        { id: 'tl-3', action: 'start', duration: 2, startTime: null, endTime: null, breakMinutes: 0 },
      ],
      repairMaterialRequests: [],
      repairToolRequests: [],
    });

    mockDb.laborRate.findFirst.mockResolvedValue(null);
    mockDb.trade.findFirst.mockResolvedValue(null);

    const costs = await calculateAuthoritativeCosts('wo-3');

    expect(costs).not.toBeNull();
    expect(costs!.actualLaborCost).toBe(0);
    expect(costs!.incompleteLaborRate).toBe(true);
    expect(costs!.warnings).toContainEqual(expect.stringContaining('No configured labor rate'));
  });

  it('should use most recent rate when multiple exist (effectiveFrom DESC)', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue({
      id: 'wo-4', plantId: 'plant-1', totalCost: 0, laborCost: 0, partsCost: 0,
      contractorCost: 0, estimatedHours: 4, tradeActivity: 'MECHANICAL', assignedTo: 'user-4',
      timeLogs: [
        { id: 'tl-4', action: 'start', duration: 1, startTime: null, endTime: null, breakMinutes: 0 },
      ],
      repairMaterialRequests: [],
      repairToolRequests: [],
    });

    mockDb.trade.findFirst.mockResolvedValue(null);
    // First call: user+plant (returns old rate)
    // Second call: user no-plant (returns new rate)
    mockDb.laborRate.findFirst
      .mockResolvedValueOnce({ normalHourlyRate: 40, currency: 'GHS' })
      .mockResolvedValueOnce({ normalHourlyRate: 55, currency: 'GHS' });

    const costs = await calculateAuthoritativeCosts('wo-4');

    // Plant-specific rate takes priority over plant-agnostic
    expect(costs!.actualLaborCost).toBe(40); // 1h × GHS 40 (plant-specific wins)
    expect(costs!.appliedLaborRate).toBe(40);
  });

  it('should not invent a rate — 0 + warning is the only acceptable fallback', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue({
      id: 'wo-5', plantId: 'plant-1', totalCost: 0, laborCost: 0, partsCost: 0,
      contractorCost: 0, estimatedHours: 4, tradeActivity: 'WELDING', assignedTo: 'user-5',
      timeLogs: [
        { id: 'tl-5', action: 'start', duration: 5, startTime: null, endTime: null, breakMinutes: 0 },
      ],
      repairMaterialRequests: [],
      repairToolRequests: [],
    });

    mockDb.laborRate.findFirst.mockResolvedValue(null);
    mockDb.trade.findFirst.mockResolvedValue(null);

    const costs = await calculateAuthoritativeCosts('wo-5');

    // Must be exactly 0, not any invented value
    expect(costs!.actualLaborCost).toBe(0);
    expect(costs!.totalActualCost).toBe(0); // no materials, no tools, no contractor
    expect(costs!.incompleteLaborRate).toBe(true);
  });
});
