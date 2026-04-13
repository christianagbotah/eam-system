import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';
import { getPlantScope, applyPlantScope } from '@/lib/plant-scope';

/**
 * GET /api/work-orders/kpi
 *
 * Returns aggregated KPI metrics for work orders:
 * - Total counts by status, priority, type
 * - Average completion time
 * - Overdue count
 * - Completion rate
 * - WO created this month vs last month trend
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Resolve plant scope
    const plantScope = await getPlantScope(request, session);
    const where: Record<string, unknown> = {};
    if (plantScope) {
      applyPlantScope(where, plantScope);
    }

    const whereClause = Object.keys(where).length > 0 ? where : undefined;

    // Run all aggregations in parallel
    const [
      statusCounts,
      priorityCounts,
      typeCounts,
      overdueWos,
      completionMetrics,
      thisMonth,
      lastMonth,
      openByAge,
    ] = await Promise.all([
      // Count by status
      db.workOrder.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { status: true },
      }),

      // Count by priority
      db.workOrder.groupBy({
        by: ['priority'],
        where: whereClause,
        _count: { priority: true },
      }),

      // Count by type
      db.workOrder.groupBy({
        by: ['type'],
        where: whereClause,
        _count: { type: true },
      }),

      // Overdue WOs: in_progress/planned/assigned with plannedEnd < now
      db.workOrder.count({
        where: {
          ...whereClause,
          status: { in: ['in_progress', 'planned', 'assigned'] },
          plannedEnd: { lt: new Date() },
        },
      }),

      // Average completion time (for completed WOs with actualStart and actualEnd)
      db.workOrder.aggregate({
        where: {
          ...whereClause,
          status: { in: ['completed', 'verified', 'closed'] },
          actualStart: { not: null },
          actualEnd: { not: null },
        },
        _avg: { actualHours: true },
        _count: true,
      }),

      // This month WO count
      db.workOrder.count({
        where: {
          ...whereClause,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      // Last month WO count
      db.workOrder.count({
        where: {
          ...whereClause,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      // Open WOs by age (days since creation)
      db.workOrder.findMany({
        where: {
          ...whereClause,
          status: { notIn: ['closed', 'cancelled'] },
        },
        select: { id: true, createdAt: true, plannedEnd: true, status: true },
      }),
    ]);

    // Calculate open by age brackets
    const now = new Date();
    const ageBrackets = { '0-3': 0, '4-7': 0, '8-14': 0, '15-30': 0, '30+': 0 };
    for (const wo of openByAge) {
      const daysOld = Math.floor((now.getTime() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysOld <= 3) ageBrackets['0-3']++;
      else if (daysOld <= 7) ageBrackets['4-7']++;
      else if (daysOld <= 14) ageBrackets['8-14']++;
      else if (daysOld <= 30) ageBrackets['15-30']++;
      else ageBrackets['30+']++;
    }

    // Format groupBy results into simple objects
    const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.status]));
    const byPriority = Object.fromEntries(priorityCounts.map((p) => [p.priority, p._count.priority]));
    const byType = Object.fromEntries(typeCounts.map((t) => [t.type, t._count.type]));

    const totalWos = Object.values(byStatus).reduce((sum: number, c) => sum + (c as number), 0);

    return NextResponse.json({
      success: true,
      data: {
        total: totalWos,
        byStatus,
        byPriority,
        byType,
        overdue: overdueWos,
        completionMetrics: {
          avgHours: completionMetrics._avg.actualHours ? Math.round(completionMetrics._avg.actualHours * 100) / 100 : 0,
          completedCount: completionMetrics._count,
        },
        trend: {
          thisMonth,
          lastMonth,
          changePercent: lastMonth > 0
            ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
            : 0,
        },
        openByAge: ageBrackets,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load work order KPIs';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
