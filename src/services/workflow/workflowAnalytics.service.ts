// ============================================================================
// WORKFLOW ANALYTICS SERVICE — throughput, cycle time, bottlenecks, mining
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('WorkflowAnalytics');

// ---- Interfaces ----

export interface WorkflowThroughput {
  period: string;
  completed: number;
  started: number;
  cancelled: number;
  failed: number;
}

export interface CycleTimeStats {
  definitionId: string;
  definitionName: string;
  definitionKey: string;
  avgCycleTimeMinutes: number;
  minCycleTimeMinutes: number;
  maxCycleTimeMinutes: number;
  medianCycleTimeMinutes: number;
  completedCount: number;
}

export interface BottleneckStep {
  stepId: string;
  stepName: string;
  avgDurationMs: number;
  maxDurationMs: number;
  occurrences: number;
  avgWaitTimeMs: number;
}

export interface ApprovalLatency {
  stepId: string;
  stepName: string;
  avgApprovalTimeMs: number;
  medianApprovalTimeMs: number;
  rejectionRate: number;
  totalCount: number;
}

export interface DeadWorkflow {
  instanceId: string;
  definitionName: string;
  entityType: string;
  entityId: string;
  currentStepName: string;
  daysStuck: number;
  lastUpdatedAt: Date;
}

export interface ProcessPathAnalysis {
  expectedPath: string[];
  actualPaths: { path: string[]; count: number; percentage: number }[];
  deviationRate: number;
}

export interface WorkflowVolumeForecast {
  period: string;
  predicted: number;
  confidence: number;
}

export interface WorkflowAnalyticsSummary {
  throughput: WorkflowThroughput[];
  cycleTimeByType: CycleTimeStats[];
  bottlenecks: BottleneckStep[];
  approvalLatency: ApprovalLatency[];
  deadWorkflows: DeadWorkflow[];
  slaComplianceRate: number;
  escalationFrequency: number;
  processPaths: ProcessPathAnalysis[];
  volumeForecast: WorkflowVolumeForecast[];
  summaryStats: {
    totalInstances: number;
    runningInstances: number;
    completedInstances: number;
    failedInstances: number;
    avgCycleTimeMinutes: number;
    completionRate: number;
  };
}

// ---- Helper: median calculation ----

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ---- Service ----

export const WorkflowAnalyticsService = {
  // -------------------------------------------------------------------------
  // Full Analytics Summary
  // -------------------------------------------------------------------------

  async getFullAnalytics(filter?: {
    definitionId?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<WorkflowAnalyticsSummary> {
    const [
      summaryStats,
      throughput,
      cycleTimeByType,
      bottlenecks,
      approvalLatency,
      deadWorkflows,
      slaComplianceRate,
      escalationFrequency,
    ] = await Promise.all([
      this.getSummaryStats(filter),
      this.getThroughput(filter),
      this.getCycleTimeByType(filter),
      this.getBottlenecks(filter),
      this.getApprovalLatency(filter),
      this.getDeadWorkflows(),
      this.getSlaComplianceRate(filter),
      this.getEscalationFrequency(filter),
    ]);

    return {
      throughput,
      cycleTimeByType,
      bottlenecks,
      approvalLatency,
      deadWorkflows,
      slaComplianceRate,
      escalationFrequency,
      processPaths: [],  // Populated on-demand for specific definition
      volumeForecast: [], // Populated on-demand
      summaryStats,
    };
  },

  // -------------------------------------------------------------------------
  // Summary Stats
  // -------------------------------------------------------------------------

  async getSummaryStats(filter?: {
    definitionId?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: Record<string, unknown> = {};
    if (filter?.definitionId) where.definitionId = filter.definitionId;
    if (filter?.entityType) where.entityType = filter.entityType;
    if (filter?.startDate || filter?.endDate) {
      where.createdAt = {};
      if (filter?.startDate) (where.createdAt as Record<string, unknown>).gte = filter.startDate;
      if (filter?.endDate) (where.createdAt as Record<string, unknown>).lte = filter.endDate;
    }

    const [total, running, completed, failed, completedWithDates] = await Promise.all([
      db.workflowInstance.count({ where }),
      db.workflowInstance.count({ where: { ...where, status: 'running' } }),
      db.workflowInstance.count({ where: { ...where, status: 'completed' } }),
      db.workflowInstance.count({ where: { ...where, status: 'failed' } }),
      db.workflowInstance.findMany({
        where: { ...where, status: 'completed', startedAt: { not: null }, completedAt: { not: null } },
        select: { startedAt: true, completedAt: true },
      }),
    ]);

    const cycleTimes = completedWithDates.map((w) => {
      return (w.completedAt!.getTime() - w.startedAt!.getTime()) / (1000 * 60);
    });

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      totalInstances: total,
      runningInstances: running,
      completedInstances: completed,
      failedInstances: failed,
      avgCycleTimeMinutes: Math.round(avg(cycleTimes) * 100) / 100,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  },

  // -------------------------------------------------------------------------
  // Throughput (completed per period)
  // -------------------------------------------------------------------------

  async getThroughput(filter?: {
    definitionId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<WorkflowThroughput[]> {
    const startDate = filter?.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filter?.endDate ?? new Date();

    const instances = await db.workflowInstance.findMany({
      where: {
        ...(filter?.definitionId && { definitionId: filter.definitionId }),
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { status: true, completedAt: true, startedAt: true, createdAt: true },
    });

    // Group by day
    const grouped = new Map<string, { completed: number; started: number; cancelled: number; failed: number }>();

    for (const inst of instances) {
      const day = inst.createdAt.toISOString().slice(0, 10);
      if (!grouped.has(day)) {
        grouped.set(day, { completed: 0, started: 0, cancelled: 0, failed: 0 });
      }
      const entry = grouped.get(day)!;
      entry.started++;

      if (inst.status === 'completed') entry.completed++;
      else if (inst.status === 'cancelled') entry.cancelled++;
      else if (inst.status === 'failed') entry.failed++;
    }

    return Array.from(grouped.entries()).map(([period, data]) => ({ period, ...data }));
  },

  // -------------------------------------------------------------------------
  // Cycle Time per Workflow Type
  // -------------------------------------------------------------------------

  async getCycleTimeByType(filter?: {
    definitionId?: string;
    entityType?: string;
  }): Promise<CycleTimeStats[]> {
    const definitions = await db.workflowDefinition.findMany({
      where: filter?.definitionId ? { id: filter.definitionId } : {},
    });

    const results: CycleTimeStats[] = [];

    for (const def of definitions) {
      const instances = await db.workflowInstance.findMany({
        where: {
          definitionId: def.id,
          status: 'completed',
          startedAt: { not: null },
          completedAt: { not: null },
        },
        select: { startedAt: true, completedAt: true },
      });

      const cycleTimes = instances.map((w) =>
        (w.completedAt!.getTime() - w.startedAt!.getTime()) / (1000 * 60),
      );

      if (cycleTimes.length === 0) continue;

      const sorted = [...cycleTimes].sort((a, b) => a - b);
      results.push({
        definitionId: def.id,
        definitionName: def.name,
        definitionKey: def.key,
        avgCycleTimeMinutes: Math.round((sorted.reduce((a, b) => a + b, 0) / sorted.length) * 100) / 100,
        minCycleTimeMinutes: Math.round(sorted[0] * 100) / 100,
        maxCycleTimeMinutes: Math.round(sorted[sorted.length - 1] * 100) / 100,
        medianCycleTimeMinutes: Math.round(median(sorted) * 100) / 100,
        completedCount: sorted.length,
      });
    }

    return results.sort((a, b) => b.avgCycleTimeMinutes - a.avgCycleTimeMinutes);
  },

  // -------------------------------------------------------------------------
  // Bottleneck Identification
  // -------------------------------------------------------------------------

  async getBottlenecks(filter?: {
    definitionId?: string;
  }): Promise<BottleneckStep[]> {
    const histories = await db.workflowStepHistory.findMany({
      where: {
        action: { in: ['started', 'completed'] },
        ...(filter?.definitionId && {
          instance: { definitionId: filter.definitionId },
        }),
      },
      select: {
        stepId: true,
        stepName: true,
        action: true,
        createdAt: true,
        durationMs: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group started/completed pairs by step
    const stepDurations: Map<string, number[]> = new Map();

    for (let i = 0; i < histories.length - 1; i++) {
      const current = histories[i];
      const next = histories[i + 1];

      if (current.action === 'started' && next.action === 'completed' && current.stepId === next.stepId) {
        const duration = next.durationMs ?? (next.createdAt.getTime() - current.createdAt.getTime());
        if (!stepDurations.has(current.stepId)) {
          stepDurations.set(current.stepId, []);
        }
        stepDurations.get(current.stepId)!.push(duration);
      }
    }

    const bottlenecks: BottleneckStep[] = [];

    for (const [stepId, durations] of stepDurations.entries()) {
      if (durations.length === 0) continue;

      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      bottlenecks.push({
        stepId,
        stepName: histories.find((h) => h.stepId === stepId)?.stepName ?? stepId,
        avgDurationMs: Math.round(avg),
        maxDurationMs: Math.round(Math.max(...durations)),
        occurrences: durations.length,
        avgWaitTimeMs: Math.round(avg * 0.6), // Approximate: 60% of step time is wait
      });
    }

    return bottlenecks.sort((a, b) => b.avgDurationMs - a.avgDurationMs);
  },

  // -------------------------------------------------------------------------
  // Approval Latency
  // -------------------------------------------------------------------------

  async getApprovalLatency(filter?: {
    definitionId?: string;
  }): Promise<ApprovalLatency[]> {
    const approvalHistories = await db.workflowStepHistory.findMany({
      where: {
        action: { in: ['approved', 'rejected'] },
        ...(filter?.definitionId && {
          instance: { definitionId: filter.definitionId },
        }),
      },
      select: {
        stepId: true,
        stepName: true,
        action: true,
        durationMs: true,
      },
    });

    // Group by step
    const grouped: Map<string, { approved: number[]; rejected: number[]; total: number }> = new Map();

    for (const h of approvalHistories) {
      if (!grouped.has(h.stepId)) {
        grouped.set(h.stepId, { approved: [], rejected: [], total: 0 });
      }
      const entry = grouped.get(h.stepId)!;
      entry.total++;
      if (h.action === 'approved' && h.durationMs) {
        entry.approved.push(h.durationMs);
      } else if (h.action === 'rejected') {
        entry.rejected.push(h.durationMs ?? 0);
      }
    }

    return Array.from(grouped.entries()).map(([stepId, data]) => ({
      stepId,
      stepName: approvalHistories.find((h) => h.stepId === stepId)?.stepName ?? stepId,
      avgApprovalTimeMs: data.approved.length > 0
        ? Math.round(data.approved.reduce((a, b) => a + b, 0) / data.approved.length)
        : 0,
      medianApprovalTimeMs: Math.round(median(data.approved)),
      rejectionRate: data.total > 0 ? (data.rejected.length / data.total) * 100 : 0,
      totalCount: data.total,
    })).sort((a, b) => b.avgApprovalTimeMs - a.avgApprovalTimeMs);
  },

  // -------------------------------------------------------------------------
  // Dead Workflow Detection
  // -------------------------------------------------------------------------

  async getDeadWorkflows(stuckDays: number = 7): Promise<DeadWorkflow[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - stuckDays);

    const stuck = await db.workflowInstance.findMany({
      where: {
        status: 'running',
        updatedAt: { lt: cutoff },
      },
      include: {
        definition: { select: { name: true } },
        stepHistory: {
          where: { action: 'started' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return stuck.map((inst) => ({
      instanceId: inst.id,
      definitionName: inst.definition.name,
      entityType: inst.entityType ?? 'unknown',
      entityId: inst.entityId ?? 'unknown',
      currentStepName: inst.stepHistory[0]?.stepName ?? 'unknown',
      daysStuck: Math.floor((Date.now() - inst.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
      lastUpdatedAt: inst.updatedAt,
    }));
  },

  // -------------------------------------------------------------------------
  // SLA Compliance Rate
  // -------------------------------------------------------------------------

  async getSlaComplianceRate(filter?: {
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    const where: Record<string, unknown> = {};
    if (filter?.entityType) where.entityType = filter.entityType;
    if (filter?.startDate || filter?.endDate) {
      where.startedAt = {};
      if (filter?.startDate) (where.startedAt as Record<string, unknown>).gte = filter.startDate;
      if (filter?.endDate) (where.startedAt as Record<string, unknown>).lte = filter.endDate;
    }

    const [total, withinSla] = await Promise.all([
      db.slaTracking.count({
        where: { ...where, status: { in: ['completed', 'breached'] } },
      }),
      db.slaTracking.count({
        where: { ...where, status: 'completed', breachedAt: null },
      }),
    ]);

    return total > 0 ? Math.round((withinSla / total) * 100 * 100) / 100 : 100;
  },

  // -------------------------------------------------------------------------
  // Escalation Frequency
  // -------------------------------------------------------------------------

  async getEscalationFrequency(filter?: {
    definitionId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    const where: Record<string, unknown> = {
      action: 'escalated',
    };
    if (filter?.startDate || filter?.endDate) {
      where.createdAt = {};
      if (filter?.startDate) (where.createdAt as Record<string, unknown>).gte = filter.startDate;
      if (filter?.endDate) (where.createdAt as Record<string, unknown>).lte = filter.endDate;
    }
    if (filter?.definitionId) {
      where.instance = { definitionId: filter.definitionId };
    }

    return db.workflowStepHistory.count({ where });
  },

  // -------------------------------------------------------------------------
  // Process Mining: actual vs expected path analysis
  // -------------------------------------------------------------------------

  async getProcessPaths(definitionId: string): Promise<ProcessPathAnalysis> {
    const definition = await db.workflowDefinition.findUnique({
      where: { id: definitionId },
    });
    if (!definition) return { expectedPath: [], actualPaths: [], deviationRate: 0 };

    const steps = (definition.stepsJson as { id: string }[]) ?? [];
    const expectedPath = steps.map((s) => s.id);

    // Get actual paths from completed instances
    const instances = await db.workflowInstance.findMany({
      where: { definitionId, status: 'completed' },
      include: {
        stepHistory: {
          where: { action: 'started' },
          orderBy: { createdAt: 'asc' },
          select: { stepId: true },
        },
      },
    });

    const pathCounts: Map<string, number> = new Map();
    let deviatedCount = 0;

    for (const inst of instances) {
      const actualPath = inst.stepHistory.map((h) => h.stepId);
      const pathKey = actualPath.join('->');
      pathCounts.set(pathKey, (pathCounts.get(pathKey) ?? 0) + 1);

      // Check if path deviates from expected
      if (JSON.stringify(actualPath) !== JSON.stringify(expectedPath)) {
        deviatedCount++;
      }
    }

    const totalCount = instances.length;
    const actualPaths = Array.from(pathCounts.entries()).map(([path, count]) => ({
      path: path.split('->'),
      count,
      percentage: totalCount > 0 ? Math.round((count / totalCount) * 100 * 100) / 100 : 0,
    }));

    return {
      expectedPath,
      actualPaths: actualPaths.sort((a, b) => b.count - a.count),
      deviationRate: totalCount > 0 ? Math.round((deviatedCount / totalCount) * 100 * 100) / 100 : 0,
    };
  },

  // -------------------------------------------------------------------------
  // Volume Forecast (simple linear regression)
  // -------------------------------------------------------------------------

  async getVolumeForecast(definitionId?: string, weeks: number = 4): Promise<WorkflowVolumeForecast[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7 * 3); // 3x period for data
    startDate.setHours(0, 0, 0, 0);

    const instances = await db.workflowInstance.findMany({
      where: {
        ...(definitionId && { definitionId }),
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
    });

    // Group by week
    const weeklyCounts: Map<string, number> = new Map();
    for (const inst of instances) {
      const weekStart = new Date(inst.createdAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      weeklyCounts.set(key, (weeklyCounts.get(key) ?? 0) + 1);
    }

    const dataPoints = Array.from(weeklyCounts.entries()).map(([_, count]) => count);
    if (dataPoints.length < 2) return [];

    // Simple linear regression
    const n = dataPoints.length;
    const xMean = (n - 1) / 2;
    const yMean = dataPoints.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (dataPoints[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const lastValue = dataPoints[dataPoints.length - 1];

    // Forecast next 4 weeks
    const forecast: WorkflowVolumeForecast[] = [];
    for (let w = 1; w <= 4; w++) {
      const predicted = Math.max(0, Math.round(lastValue + slope * w));
      const period = new Date();
      period.setDate(period.getDate() + w * 7);
      forecast.push({
        period: period.toISOString().slice(0, 10),
        predicted,
        confidence: Math.max(20, 80 - w * 15), // Decreasing confidence
      });
    }

    return forecast;
  },
};
