// ============================================================================
// INDUSTRIAL KPI SERVICE — Standard industrial KPI calculations
// OEE, MTBF, MTTR, Availability, Reliability, Backlog, PM Compliance, etc.
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { cache, CACHE_TTL } from '@/lib/cache';

const logger = createLogger('industrialKpi');

export interface OEEData {
  availability: number;    // A = Uptime / Planned Production Time
  performance: number;     // P = (Ideal Cycle Time × Units Produced) / Operating Time
  quality: number;         // Q = Good Units / Total Units Produced
  oee: number;             // OEE = A × P × Q
  period: string;
}

export interface ReliabilityKpis {
  mtbf: number;          // Mean Time Between Failures (hours)
  mttr: number;          // Mean Time To Repair (hours)
  mttf: number;          // Mean Time To Failure (hours)
  availability: number;  // Uptime / (Uptime + Downtime)
  failureRate: number;   // Failures per 1000 operating hours
  plannedMaintenanceCompliance: number; // PMs completed / PMs scheduled
}

export interface MaintenanceBacklog {
  totalOpen: number;
  byPriority: Record<string, number>;
  byAge: Record<string, number>;
  oldestUnassigned: string | null;
  estimatedHours: number;
  averageResolutionHours: number;
  overdueCount: number;
}

export interface ProductionImpactData {
  downtimeHours: number;
  productionLossUnits: number;
  costImpact: number;
  mttrImpact: number;
  byFailureMode: Record<string, number>;
  byAssetCategory: Record<string, number>;
}

export class IndustrialKpiService {
  /**
   * Calculate Overall Equipment Effectiveness (OEE)
   */
  static async calculateOEE(plantId?: string, days: number = 30): Promise<OEEData> {
    const cacheKey = `kpi:oee:${plantId || 'all'}:${days}`;

    return cache.getOrSet(cacheKey, async () => {
      const since = new Date(Date.now() - days * 86400000);

      // Get work orders for the period as production proxy
      const completedWOs = await db.workOrder.count({
        where: {
          ...(plantId ? { plantId } : {}),
          status: 'completed',
          actualEnd: { gte: since },
        },
      });

      const totalWOs = await db.workOrder.count({
        where: {
          ...(plantId ? { plantId } : {}),
          createdAt: { gte: since },
        },
      });

      // Proxy calculations (in production, use actual production data)
      const completionRate = totalWOs > 0 ? completedWOs / totalWOs : 0;
      const scheduleAdherence = 0.92; // Simulated

      const availability = Math.min(1, completionRate * 1.05);
      const performance = scheduleAdherence;
      const quality = 0.95; // Simulated first-pass yield

      const oee = availability * performance * quality;

      return {
        availability: Math.round(availability * 1000) / 10,
        performance: Math.round(performance * 1000) / 10,
        quality: Math.round(quality * 1000) / 10,
        oee: Math.round(oee * 100) / 100,
        period: `${days}d`,
      };
    }, CACHE_TTL.LONG);
  }

  /**
   * Calculate reliability KPIs
   */
  static async calculateReliability(plantId?: string, days: number = 365): Promise<ReliabilityKpis> {
    const cacheKey = `kpi:reliability:${plantId || 'all'}:${days}`;

    return cache.getOrSet(cacheKey, async () => {
      const since = new Date(Date.now() - days * 86400000);

      // Failure records
      const failureCount = await db.failureRecord.count({
        where: { detectedAt: { gte: since } },
      });

      // Work orders with failure description
      const failureWOs = await db.workOrder.findMany({
        where: {
          ...(plantId ? { plantId } : {}),
          status: 'completed',
          actualEnd: { gte: since },
          actualHours: { gt: 0 },
          description: { contains: 'failure' },
        },
        select: { actualHours: true, createdAt: true },
      });

      // Planned maintenance compliance
      const pmCompleted = await db.workOrder.count({
        where: {
          ...(plantId ? { plantId } : {}),
          type: 'preventive',
          status: 'completed',
          actualEnd: { gte: since },
        },
      });

      const pmTotal = await db.workOrder.count({
        where: {
          ...(plantId ? { plantId } : {}),
          type: 'preventive',
          status: { in: ['approved', 'planned', 'assigned', 'in_progress', 'completed'] },
        },
      });

      const operatingDays = Math.max(1, days);

      // MTBF = Total Operating Hours / Number of Failures
      const totalOperatingHours = operatingDays * 24;
      const mtbf = failureCount > 0 ? Math.round(totalOperatingHours / failureCount) : 999;

      // MTTR = Total Repair Hours / Number of Repairs
      const totalRepairHours = failureWOs.reduce((s, wo) => s + (wo.actualHours || 0), 0);
      const mttr = failureWOs.length > 0 ? Math.round(totalRepairHours / failureWOs.length) : 0;

      // MTTF = Total Operating Hours / Total Failure Events
      const mttf = failureCount > 0 ? Math.round(totalOperatingHours / failureCount) : mtbf;

      // Availability
      const totalDowntimeHours = failureWOs.reduce((s, wo) => s + (wo.actualHours || 0), 0);
      const availability = totalOperatingHours + totalDowntimeHours > 0
        ? Math.round((totalOperatingHours / (totalOperatingHours + totalDowntimeHours)) * 1000) / 10
        : 1000;

      // Failure rate (per 1000 operating hours)
      const failureRate = totalOperatingHours > 0
        ? Math.round((failureCount / totalOperatingHours) * 10000) / 100
        : 0;

      // PM compliance
      const plannedMaintenanceCompliance = pmTotal > 0
        ? Math.round((pmCompleted / pmTotal) * 1000) / 10
        : 0;

      return {
        mtbf,
        mttr,
        mttf,
        availability: availability / 10,
        failureRate,
        plannedMaintenanceCompliance: plannedMaintenanceCompliance / 10,
      };
    }, CACHE_TTL.LONG);
  }

  /**
   * Calculate maintenance backlog
   */
  static async calculateBacklog(plantId?: string): Promise<MaintenanceBacklog> {
    const cacheKey = `kpi:backlog:${plantId || 'all'}`;

    return cache.getOrSet(cacheKey, async () => {
      const openWOs = await db.workOrder.findMany({
        where: {
          ...(plantId ? { plantId } : {}),
          status: { in: ['approved', 'planned', 'assigned', 'in_progress', 'waiting_parts'] },
        },
        select: {
          id: true,
          priority: true,
          createdAt: true,
          estimatedHours: true,
          actualHours: true,
          actualStart: true,
          plannedEnd: true,
          status: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      });

      const byPriority: Record<string, number> = {};
      const byAge: Record<string, number> = {};
      let totalEstimated = 0;
      let oldestDate: string | null = null;

      for (const wo of openWOs) {
        byPriority[wo.priority || 'medium'] = (byPriority[wo.priority || 'medium'] || 0) + 1;

        const ageMs = Date.now() - new Date(wo.createdAt).getTime();
        const ageDays = Math.floor(ageMs / 86400000);
        const ageKey = ageDays < 7 ? '<7d' : ageDays < 30 ? '7-30d' : ageDays < 90 ? '30-90d' : '>90d';
        byAge[ageKey] = (byAge[ageKey] || 0) + 1;

        totalEstimated += wo.estimatedHours || 4;

        if (!oldestDate || wo.createdAt < oldestDate) {
          oldestDate = wo.createdAt;
        }
      }

      const completedWOs = await db.workOrder.findMany({
        where: {
          ...(plantId ? { plantId } : {}),
          status: 'completed',
        },
        select: { createdAt: true, actualStart: true, actualEnd: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const completedWithTimes = completedWOs.filter(wo => wo.actualStart && wo.actualEnd);
      const totalResolutionMs = completedWithTimes.reduce((s, wo) => {
        return s + (new Date(wo.actualEnd!).getTime() - new Date(wo.actualStart!).getTime());
      }, 0);
      const avgResolutionHours = completedWithTimes.length > 0
        ? Math.round(totalResolutionMs / completedWithTimes.length / 3600000 * 10) / 10
        : 0;

      const now = new Date();
      const overdue = openWOs.filter(wo => {
        const dueDate = wo.plannedEnd || wo.actualStart || wo.createdAt;
        return new Date(dueDate) < now && (wo.status === 'planned' || wo.status === 'assigned');
      });

      return {
        totalOpen: openWOs.length,
        byPriority,
        byAge,
        oldestUnassigned: oldestDate,
        estimatedHours: totalEstimated,
        averageResolutionHours: avgResolutionHours,
        overdueCount: overdue.length,
      };
    }, CACHE_TTL.MEDIUM);
  }

  /**
   * Get comprehensive maintenance KPI dashboard
   */
  static async getKpiDashboard(plantId?: string): Promise<{
    oee: OEEData;
    reliability: ReliabilityKpis;
    backlog: MaintenanceBacklog;
    productionImpact: ProductionImpactData;
    trends: Array<{ period: string; oee: number; mtbf: number; backlog: number }>;
  }> {
    const cacheKey = `kpi:dashboard:${plantId || 'all'}`;

    return cache.getOrSet(cacheKey, async () => {
      const [oee, reliability, backlog] = await Promise.all([
        this.calculateOEE(plantId, 30),
        this.calculateReliability(plantId, 365),
        this.calculateBacklog(plantId),
      ]);

      // Calculate production impact (estimated)
      const downtimeHours = backlog.averageResolutionHours * backlog.overdueCount;
      const productionImpact: ProductionImpactData = {
        downtimeHours,
        productionLossUnits: Math.round(downtimeHours * 10), // 10 units/hour proxy
        costImpact: Math.round(downtimeHours * 500), // $500/hour proxy
        mttrImpact: Math.round((reliability.mttr - (reliability.mttr * 0.85)) * 100) / 100,
        byFailureMode: { mechanical: 35, electrical: 25, instrumentation: 20, other: 20 },
        byAssetCategory: { production: 40, utility: 25, safety: 20, infrastructure: 15 },
      };

      // Get trend data (last 6 periods)
      const trends: Array<{ period: string; oee: number; mtbf: number; backlog: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const periodDays = (i + 1) * 30;
        const period = `Last ${periodDays}d`;
        const [tOee, tRel, tBacklog] = await Promise.all([
          this.calculateOEE(plantId, periodDays),
          this.calculateReliability(plantId, periodDays),
          this.calculateBacklog(plantId),
        ]);
        trends.push({ period, oee: tOee.oee, mtbf: tRel.mtbf, backlog: tBacklog.totalOpen });
      }

      return { oee, reliability, backlog, productionImpact, trends };
    }, CACHE_TTL.LONG);
  }
}
