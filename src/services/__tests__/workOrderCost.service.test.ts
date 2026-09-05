import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, mockLabor } = vi.hoisted(() => ({
  mockDb: {
    workOrder: { findUnique: vi.fn() },
  },
  mockLabor: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/services/workOrderLaborCost.service', () => ({
  calculateWorkOrderLaborCost: mockLabor,
}));

import { calculateAuthoritativeWorkOrderCost } from '@/services/workOrderCost.service';

describe('calculateAuthoritativeWorkOrderCost', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('combines per-worker labor with consumed/wasted materials and persisted contractor cost', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue({
      totalCost: 900,
      contractorCost: 125,
      repairMaterialRequests: [
        { unitCost: 25, consumedQty: 4, wastedQty: 1 }, // 125
        { unitCost: 10, consumedQty: 2, wastedQty: 0 }, // 20
      ],
    });
    mockLabor.mockResolvedValue({
      laborHours: 5,
      actualLaborCost: 340,
      incompleteLaborRate: false,
      appliedLaborRate: 68,
      appliedLaborCurrency: 'GHS',
      warnings: [],
      segments: [],
    });

    const result = await calculateAuthoritativeWorkOrderCost('wo-1');

    expect(result).toEqual(expect.objectContaining({
      plannedCost: 900,
      actualLaborCost: 340,
      actualMaterialCost: 145,
      actualToolCost: 0,
      actualContractorCost: 125,
      totalActualCost: 610,
      laborHours: 5,
      incompleteLaborRate: false,
      appliedLaborRate: 68,
      appliedLaborCurrency: 'GHS',
    }));
    expect(result?.toolCostNote).toContain('custody');
  });

  it('does not charge reusable tool custody as consumption', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue({
      totalCost: 0,
      contractorCost: 0,
      repairMaterialRequests: [],
    });
    mockLabor.mockResolvedValue({
      laborHours: 0,
      actualLaborCost: 0,
      incompleteLaborRate: false,
      appliedLaborRate: null,
      appliedLaborCurrency: null,
      warnings: [],
      segments: [],
    });

    const result = await calculateAuthoritativeWorkOrderCost('wo-1');

    expect(result?.actualToolCost).toBe(0);
    expect(result?.totalActualCost).toBe(0);
  });

  it('preserves known labor cost but marks the total incomplete when some labor segments are unpriced', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue({
      totalCost: 0,
      contractorCost: 20,
      repairMaterialRequests: [],
    });
    mockLabor.mockResolvedValue({
      laborHours: 3,
      actualLaborCost: 50,
      incompleteLaborRate: true,
      appliedLaborRate: null,
      appliedLaborCurrency: 'GHS',
      warnings: ['No configured labor rate found for Assistant One; 2.00 labor hour(s) are uncosted.'],
      segments: [],
    });

    const result = await calculateAuthoritativeWorkOrderCost('wo-1');

    expect(result?.totalActualCost).toBe(70);
    expect(result?.incompleteLaborRate).toBe(true);
    expect(result?.warnings.join(' ')).toContain('Assistant One');
    expect(result?.warnings.join(' ')).toContain('Total actual cost is incomplete');
  });

  it('fails closed on mixed-currency labor supplied by the labor engine', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue({
      totalCost: 0,
      contractorCost: 10,
      repairMaterialRequests: [],
    });
    mockLabor.mockResolvedValue({
      laborHours: 2,
      actualLaborCost: 0,
      incompleteLaborRate: true,
      appliedLaborRate: null,
      appliedLaborCurrency: null,
      warnings: ['Labor entries use multiple currencies (GHS, USD).'],
      segments: [],
    });

    const result = await calculateAuthoritativeWorkOrderCost('wo-1');

    expect(result?.actualLaborCost).toBe(0);
    expect(result?.actualContractorCost).toBe(10);
    expect(result?.totalActualCost).toBe(10);
    expect(result?.incompleteLaborRate).toBe(true);
  });

  it('returns null if either the work order or labor source is unavailable', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(null);
    mockLabor.mockResolvedValue(null);

    await expect(calculateAuthoritativeWorkOrderCost('missing')).resolves.toBeNull();
  });
});
