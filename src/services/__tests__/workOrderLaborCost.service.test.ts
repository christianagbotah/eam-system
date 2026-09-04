import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    workOrder: { findUnique: vi.fn() },
    laborRate: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    trade: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));

import {
  calculateWorkOrderLaborCost,
  resolveLaborLogHours,
} from '@/services/workOrderLaborCost.service';

const T0 = new Date('2026-09-04T08:00:00.000Z');

function log(
  userId: string,
  hours: number,
  offsetHours = 0,
) {
  const start = new Date(T0.getTime() + offsetHours * 3_600_000);
  return {
    userId,
    action: 'start',
    duration: hours,
    timestamp: start,
    startTime: start,
    endTime: new Date(start.getTime() + hours * 3_600_000),
    breakMinutes: 0,
  };
}

function wo(timeLogs: ReturnType<typeof log>[], overrides: Record<string, unknown> = {}) {
  return {
    id: 'wo-1',
    plantId: 'plant-1',
    tradeActivity: 'MECHANICAL',
    timeLogs,
    ...overrides,
  };
}

describe('resolveLaborLogHours', () => {
  it('counts only labor-bearing start/resume rows', () => {
    expect(resolveLaborLogHours(log('tech-1', 2))).toBe(2);
    expect(resolveLaborLogHours({ ...log('tech-1', 2), action: 'complete' })).toBe(0);
    expect(resolveLaborLogHours({ ...log('tech-1', 2), action: 'pause' })).toBe(0);
  });

  it('derives a closed window and deducts breaks when duration is absent', () => {
    expect(resolveLaborLogHours({
      userId: 'tech-1',
      action: 'resume',
      duration: null,
      timestamp: T0,
      startTime: T0,
      endTime: new Date(T0.getTime() + 3 * 3_600_000),
      breakMinutes: 30,
    })).toBe(2.5);
  });
});

describe('calculateWorkOrderLaborCost', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('prices each technician at that technician\'s own effective rate', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(wo([
      log('tech-1', 2),
      log('tech-2', 3, 2),
    ]));

    mockDb.laborRate.findFirst
      .mockResolvedValueOnce({ normalHourlyRate: 50, currency: 'GHS' })
      .mockResolvedValueOnce({ normalHourlyRate: 80, currency: 'GHS' });

    const result = await calculateWorkOrderLaborCost('wo-1');

    expect(result).not.toBeNull();
    expect(result!.laborHours).toBe(5);
    expect(result!.actualLaborCost).toBe(340); // 2×50 + 3×80
    expect(result!.appliedLaborRate).toBe(68); // weighted/blended snapshot
    expect(result!.appliedLaborCurrency).toBe('GHS');
    expect(result!.incompleteLaborRate).toBe(false);
    expect(result!.segments.map((s) => [s.userId, s.cost])).toEqual([
      ['tech-1', 100],
      ['tech-2', 240],
    ]);
  });

  it('resolves the rate using the time the labor occurred, not completion time', async () => {
    const historicalStart = new Date('2025-01-10T08:00:00.000Z');
    mockDb.workOrder.findUnique.mockResolvedValue(wo([{
      ...log('tech-1', 2),
      timestamp: historicalStart,
      startTime: historicalStart,
      endTime: new Date(historicalStart.getTime() + 2 * 3_600_000),
    }]));
    mockDb.laborRate.findFirst.mockResolvedValue({ normalHourlyRate: 40, currency: 'GHS' });

    await calculateWorkOrderLaborCost('wo-1');

    expect(mockDb.laborRate.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        effectiveFrom: { lte: historicalStart },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: historicalStart } }],
      }),
    }));
  });

  it('falls back from a missing user rate to the worker primary trade rate', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(wo([log('tech-2', 2)]));
    mockDb.laborRate.findFirst
      .mockResolvedValueOnce(null) // user + plant
      .mockResolvedValueOnce(null) // user global
      .mockResolvedValueOnce({ normalHourlyRate: 65, currency: 'GHS' }); // trade + plant
    mockDb.user.findUnique.mockResolvedValue({ fullName: 'Electrical Tech', primaryTrade: 'ELECTRICAL' });
    mockDb.trade.findFirst.mockResolvedValue({ id: 'trade-electrical' });

    const result = await calculateWorkOrderLaborCost('wo-1');

    expect(result!.actualLaborCost).toBe(130);
    expect(result!.segments[0].source).toBe('trade');
    expect(mockDb.trade.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [{ code: 'ELECTRICAL' }, { name: 'ELECTRICAL' }],
      }),
    }));
  });

  it('keeps known hours but flags a missing worker rate instead of pricing them as the assignee', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(wo([
      log('tech-1', 1),
      log('assistant-1', 2, 1),
    ]));
    mockDb.laborRate.findFirst
      .mockResolvedValueOnce({ normalHourlyRate: 50, currency: 'GHS' })
      .mockResolvedValue(null);
    mockDb.user.findUnique.mockResolvedValue({ fullName: 'Assistant One', primaryTrade: null });
    mockDb.trade.findFirst.mockResolvedValue(null);

    const result = await calculateWorkOrderLaborCost('wo-1');

    expect(result!.laborHours).toBe(3);
    expect(result!.actualLaborCost).toBe(50); // only the known 1h segment is costed
    expect(result!.incompleteLaborRate).toBe(true);
    expect(result!.warnings.join(' ')).toContain('Assistant One');
    expect(result!.segments.find((s) => s.userId === 'assistant-1')?.source).toBe('missing');
  });

  it('does not add different currencies without an authoritative FX source', async () => {
    mockDb.workOrder.findUnique.mockResolvedValue(wo([
      log('tech-1', 1),
      log('tech-2', 1, 1),
    ]));
    mockDb.laborRate.findFirst
      .mockResolvedValueOnce({ normalHourlyRate: 50, currency: 'GHS' })
      .mockResolvedValueOnce({ normalHourlyRate: 10, currency: 'USD' });

    const result = await calculateWorkOrderLaborCost('wo-1');

    expect(result!.laborHours).toBe(2);
    expect(result!.actualLaborCost).toBe(0);
    expect(result!.appliedLaborCurrency).toBeNull();
    expect(result!.appliedLaborRate).toBeNull();
    expect(result!.incompleteLaborRate).toBe(true);
    expect(result!.warnings.join(' ')).toContain('multiple currencies');
  });
});
