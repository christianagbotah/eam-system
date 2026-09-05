import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export interface LaborRateSegment {
  userId: string;
  workerName: string;
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
  // The delegate exists on the generated Prisma client. The defensive guard is
  // intentionally retained for historical test fixtures and legacy adapters
  // that expose only the delegates required by their older contract.
  if (!client.laborRate?.findFirst) return null;
  if (!params.userId && !params.tradeId) return null;

  const effective = {
    effectiveFrom: { lte: params.effectiveAt },
    OR: [{ effectiveTo: null }, { effectiveTo: { gte: params.effectiveAt } }],
  };

  // User overrides may legitimately carry tradeId metadata, so user lookups
  // constrain only userId. Trade fallback must explicitly require userId=null;
  // otherwise another technician's user-specific override for the same trade
  // could be selected and silently misprice this worker's labor.
  const identity = params.userId
    ? { userId: params.userId }
    : { tradeId: params.tradeId, userId: null };

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
 * Calculate Repairs labor from the people who actually logged the work.
 *
 * Accounting rules:
 * - only start/resume execution sessions bear labor hours;
 * - explicit duration wins, otherwise a closed start/end window is derived;
 * - every worker is priced independently, never at the assignee's rate;
 * - the rate is resolved at the time the labor occurred;
 * - user+plant > user-global > worker trade+plant > worker trade-global > WO trade;
 * - multiple currencies are never silently added because Repairs has no
 *   authoritative FX conversion source.
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
      assignedTo: true,
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
          user: {
            select: {
              fullName: true,
              primaryTrade: true,
            },
          },
        },
      },
    },
  });
  if (!wo) return null;

  const warnings: string[] = [];
  const segments: LaborRateSegment[] = [];
  const tradeCache = new Map<string, string | null>();
  const workerCache = new Map<string, { fullName: string; primaryTrade: string | null }>();

  const resolveTradeId = async (tradeCodeOrName: string | null): Promise<string | null> => {
    if (!tradeCodeOrName) return null;
    if (tradeCache.has(tradeCodeOrName)) return tradeCache.get(tradeCodeOrName) ?? null;
    if (!client.trade?.findFirst) {
      tradeCache.set(tradeCodeOrName, null);
      return null;
    }

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

    // Production time-log rows always carry userId and timestamp. assignedTo
    // and the epoch fallback keep historical records/older fixtures readable
    // without changing the production identity precedence.
    const workerUserId = log.userId ?? wo.assignedTo;
    const effectiveAt = log.startTime ?? log.timestamp ?? new Date(0);

    if (!workerUserId) {
      warnings.push(
        `${hours.toFixed(2)} labor hour(s) have no technician identity and cannot be authoritatively costed.`,
      );
      segments.push({
        userId: 'unknown',
        workerName: 'Unknown technician',
        hours,
        hourlyRate: null,
        currency: null,
        source: 'missing',
        effectiveAt,
        cost: 0,
      });
      continue;
    }

    let worker = log.user
      ? { fullName: log.user.fullName, primaryTrade: log.user.primaryTrade }
      : workerCache.get(workerUserId);

    // Prisma returns the selected user relation for normal rows. The guarded
    // lookup keeps historical fixtures/legacy data shapes safe while still
    // resolving the real technician whenever the delegate is available.
    if (!worker) {
      const user = client.user?.findUnique
        ? await client.user.findUnique({
            where: { id: workerUserId },
            select: { fullName: true, primaryTrade: true },
          })
        : null;
      worker = {
        fullName: user?.fullName ?? workerUserId,
        primaryTrade: user?.primaryTrade ?? null,
      };
      workerCache.set(workerUserId, worker);
    }

    let rate = await findRate(client, {
      userId: workerUserId,
      plantId: wo.plantId,
      effectiveAt,
    });
    let source: LaborRateSegment['source'] = 'user';

    if (!rate) {
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
      warnings.push(
        `No configured labor rate found for ${worker.fullName}; ${hours.toFixed(2)} labor hour(s) are uncosted.`,
      );
      segments.push({
        userId: workerUserId,
        workerName: worker.fullName,
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
      userId: workerUserId,
      workerName: worker.fullName,
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
  const noLaborEvidence = wo.timeLogs.length === 0;

  if (noLaborEvidence) {
    warnings.push('No labor execution sessions are recorded; labor costing is incomplete.');
  } else if (laborHours === 0) {
    warnings.push(
      'Labor hours resolved to 0 despite time log entries; check for missing duration/start/end data.',
    );
  }

  if (mixedCurrencies) {
    warnings.push(
      `Labor entries use multiple currencies (${[...currencies].sort().join(', ')}); labor cost was not aggregated because Repairs has no authoritative FX conversion source.`,
    );
  }

  const incompleteLaborRate = noLaborEvidence || missingRate || mixedCurrencies;
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
