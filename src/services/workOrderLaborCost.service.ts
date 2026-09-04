import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export interface LaborRateSegment {
  userId: string;
  hours: number;
  hourlyRate: number | null;
  currency: string | null;
  source: 'user' | 'trade' | 'missing';
  effectiveAt: Date;
  cost: number;
}

export interface WorkOrderLaborCostResult {
  laborHours: number;
  actualLaborCost: number;
  incompleteLaborRate: boolean;
  appliedLaborRate: number | null;
  appliedLaborCurrency: string | null;
  warnings: string[];
  segments: LaborRateSegment[];
}

type TxClient = Prisma.TransactionClient;

type LaborLog = {
  userId: string;
  action: string;
  duration: number | null;
  timestamp: Date;
  startTime: Date | null;
  endTime: Date | null;
  breakMinutes: number | null;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolveLaborLogHours(log: LaborLog): number {
  if (log.action !== 'start' && log.action !== 'resume') return 0;
  if (log.duration != null && log.duration > 0) return round2(log.duration);
  if (!log.endTime) return 0;

  const start = log.startTime ?? log.timestamp;
  const elapsedHours = (log.endTime.getTime() - start.getTime()) / 3_600_000;
  const breakHours = (log.breakMinutes ?? 0) / 60;
  return round2(Math.max(0, elapsedHours - breakHours));
}

async function findRate(
  client: TxClient | typeof db,
  params: {
    userId?: string;
    tradeId?: string;
    plantId: string | null;
    effectiveAt: Date;
  },
) {
  const effective = {
    effectiveFrom: { lte: params.effectiveAt },
    OR: [{ effectiveTo: null }, { effectiveTo: { gte: params.effectiveAt } }],
  };

  const identity = params.userId
    ? { userId: params.userId }
    : { tradeId: params.tradeId };

  if (params.plantId) {
    const plantRate = await client.laborRate.findFirst({
      where: { ...identity, plantId: params.plantId, ...effective },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (plantRate) return plantRate;
  }

  return client.laborRate.findFirst({
    where: { ...identity, plantId: null, ...effective },
    orderBy: { effectiveFrom: 'desc' },
  });
}

/**
 * Calculates Repairs labor from the people who actually logged the work.
 *
 * Important accounting rules:
 * - start/resume execution sessions are the only labor-bearing lifecycle rows;
 * - explicit duration wins, otherwise a closed start/end window is derived;
 * - every technician is priced independently, never at the assignee's rate;
 * - rates are resolved at the time the labor occurred, not at report/completion time;
 * - user+plant > user-global > worker trade+plant > worker trade-global > WO trade fallback;
 * - mixed currencies are never silently added together because there is no FX
 *   conversion source in the Repairs cost model.
 */
export async function calculateWorkOrderLaborCost(
  workOrderId: string,
  tx?: Prisma.TransactionClient,
): Promise<WorkOrderLaborCostResult | null> {
  const client = tx ?? db;
  const wo = await client.workOrder.findUnique({
    where: { id: workOrderId },
    select: {
      id: true,
      plantId: true,
      tradeActivity: true,
      timeLogs: {
        select: {
          userId: true,
          action: true,
          duration: true,
          timestamp: true,
          startTime: true,
          endTime: true,
          breakMinutes: true,
        },
      },
    },
  });
  if (!wo) return null;

  const warnings: string[] = [];
  const segments: LaborRateSegment[] = [];
  const workerCache = new Map<string, { fullName: string; primaryTrade: string | null }>();
  const tradeCache = new Map<string, string | null>();

  const resolveTradeId = async (tradeCodeOrName: string | null): Promise<string | null> => {
    if (!tradeCodeOrName) return null;
    if (tradeCache.has(tradeCodeOrName)) return tradeCache.get(tradeCodeOrName) ?? null;
    const trade = await client.trade.findFirst({
      where: {
        OR: [{ code: tradeCodeOrName }, { name: tradeCodeOrName }],
        isActive: true,
      },
      select: { id: true },
    });
    const tradeId = trade?.id ?? null;
    tradeCache.set(tradeCodeOrName, tradeId);
    return tradeId;
  };

  for (const log of wo.timeLogs) {
    const hours = resolveLaborLogHours(log);
    if (hours <= 0) continue;

    const effectiveAt = log.startTime ?? log.timestamp;
    let rate = await findRate(client, {
      userId: log.userId,
      plantId: wo.plantId,
      effectiveAt,
    });
    let source: LaborRateSegment['source'] = 'user';

    if (!rate) {
      let worker = workerCache.get(log.userId);
      if (!worker) {
        const user = await client.user.findUnique({
          where: { id: log.userId },
          select: { fullName: true, primaryTrade: true },
        });
        worker = {
          fullName: user?.fullName ?? log.userId,
          primaryTrade: user?.primaryTrade ?? null,
        };
        workerCache.set(log.userId, worker);
      }

      const tradeId = await resolveTradeId(worker.primaryTrade ?? wo.tradeActivity);
      if (tradeId) {
        rate = await findRate(client, {
          tradeId,
          plantId: wo.plantId,
          effectiveAt,
        });
        source = 'trade';
      }
    }

    if (!rate) {
      const workerName = workerCache.get(log.userId)?.fullName ?? log.userId;
      warnings.push(`No configured labor rate found for ${workerName}; ${hours.toFixed(2)} labor hour(s) are uncosted.`);
      segments.push({
        userId: log.userId,
        hours,
        hourlyRate: null,
        currency: null,
        source: 'missing',
        effectiveAt,
        cost: 0,
      });
      continue;
    }

    segments.push({
      userId: log.userId,
      hours,
      hourlyRate: rate.normalHourlyRate,
      currency: rate.currency,
      source,
      effectiveAt,
      cost: round2(hours * rate.normalHourlyRate),
    });
  }

  const laborHours = round2(segments.reduce((sum, segment) => sum + segment.hours, 0));
  const missingRate = segments.some((segment) => segment.hourlyRate == null);
  const currencies = new Set(
    segments
      .map((segment) => segment.currency)
      .filter((currency): currency is string => Boolean(currency)),
  );
  const mixedCurrencies = currencies.size > 1;

  if (laborHours === 0 && wo.timeLogs.length > 0) {
    warnings.push('Labor hours resolved to 0 despite time log entries; check for missing duration/start/end data.');
  }
  if (mixedCurrencies) {
    warnings.push(
      `Labor entries use multiple currencies (${[...currencies].sort().join(', ')}); labor cost was not aggregated because Repairs has no authoritative FX conversion source.`,
    );
  }

  const incompleteLaborRate = missingRate || mixedCurrencies || (laborHours > 0 && segments.length === 0);
  const actualLaborCost = mixedCurrencies
    ? 0
    : round2(segments.reduce((sum, segment) => sum + segment.cost, 0));
  const appliedLaborCurrency = currencies.size === 1 ? [...currencies][0] : null;
  const appliedLaborRate = !incompleteLaborRate && laborHours > 0
    ? round2(actualLaborCost / laborHours)
    : null;

  return {
    laborHours,
    actualLaborCost,
    incompleteLaborRate,
    appliedLaborRate,
    appliedLaborCurrency,
    warnings,
    segments,
  };
}
