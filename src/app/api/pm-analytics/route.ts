import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

/**
 * GET /api/pm-analytics
 *
 * Returns comprehensive PM program health metrics:
 * - complianceRate: % of PM WOs completed within their planned end date
 * - overdueCount: Active PM schedules past their nextDueDate
 * - upcomingCount: PM schedules due within next 7 days
 * - totalSchedules: Total active schedules
 * - totalGenerated: Total WOs generated from PM schedules
 * - avgCompletionDays: Average days from WO creation to completion for PM WOs
 * - byDepartment: Breakdown by department (counts and compliance)
 * - monthlyTrend: Last 12 months of PM WO generation (month, generated, completed)
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'pm_analytics.view')) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // ── Run independent queries in parallel ──

    const [
      totalSchedules,
      overdueSchedules,
      upcomingSchedules,
      pmWorkOrders,
      departmentBreakdown,
      monthlyData,
    ] = await Promise.all([
      // 1. Total active schedules
      db.pmSchedule.count({ where: { isActive: true } }),

      // 2. Overdue schedules (nextDueDate < now and active)
      db.pmSchedule.count({
        where: {
          isActive: true,
          nextDueDate: { not: null, lt: now },
        },
      }),

      // 3. Upcoming schedules (due within 7 days)
      db.pmSchedule.count({
        where: {
          isActive: true,
          nextDueDate: { not: null, gte: now, lte: weekFromNow },
        },
      }),

      // 4. All PM work orders (generated from schedules) with completion info
      db.workOrder.findMany({
        where: { pmScheduleId: { not: null } },
        select: {
          id: true,
          createdAt: true,
          actualEnd: true,
          plannedEnd: true,
          status: true,
          departmentId: true,
        },
      }),

      // 5. Department breakdown — schedule counts per department
      db.pmSchedule.groupBy({
        by: ['departmentId'],
        where: { isActive: true },
        _count: { id: true },
        having: { departmentId: { not: null } },
      }),

      // 6. Monthly trend — PM WOs created per month (last 12 months)
      db.$queryRawUnsafe<
        Array<{ month: string; generated: number; completed: number }>
      >(
        `
        SELECT
          strftime('%Y-%m', w."createdAt") as month,
          COUNT(*) as generated,
          SUM(CASE WHEN w."actualEnd" IS NOT NULL THEN 1 ELSE 0 END) as completed
        FROM "work_orders" w
        WHERE w."pmScheduleId" IS NOT NULL
          AND w."createdAt" >= datetime('now', '-12 months')
        GROUP BY strftime('%Y-%m', w."createdAt")
        ORDER BY month ASC
        `,
      ),
    ]);

    // ── Compute compliance rate ──
    // PM WOs completed on or before their planned end date
    const completedPmWos = pmWorkOrders.filter(
      (wo) => wo.status === 'completed' || wo.status === 'closed',
    );
    const completedOnTime = completedPmWos.filter((wo) => {
      if (!wo.actualEnd || !wo.plannedEnd) return true; // if no planned end, consider on time
      return new Date(wo.actualEnd) <= new Date(wo.plannedEnd);
    }).length;

    const complianceRate =
      completedPmWos.length > 0
        ? Math.round((completedOnTime / completedPmWos.length) * 100)
        : 100; // No completed WOs = 100% compliance (nothing late)

    // ── Compute avg completion days ──
    const wosWithCompletion = completedPmWos.filter((wo) => wo.actualEnd);
    const totalCompletionDays = wosWithCompletion.reduce((sum, wo) => {
      const days = (new Date(wo.actualEnd!).getTime() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    const avgCompletionDays =
      wosWithCompletion.length > 0
        ? Math.round((totalCompletionDays / wosWithCompletion.length) * 10) / 10
        : 0;

    // ── Build byDepartment breakdown ──
    // Enrich department group data with compliance info
    const deptIds = departmentBreakdown.map((d) => d.departmentId!);
    const deptNames = deptIds.length > 0
      ? await db.department.findMany({
          where: { id: { in: deptIds } },
          select: { id: true, name: true, code: true },
        })
      : [];

    const deptNameMap = new Map(deptNames.map((d) => [d.id, d]));

    // Compute per-department compliance
    const deptComplianceMap = new Map<string, { total: number; onTime: number }>();
    for (const wo of completedPmWos) {
      const dId = wo.departmentId;
      if (!dId) continue;
      const entry = deptComplianceMap.get(dId) || { total: 0, onTime: 0 };
      entry.total++;
      if (!wo.actualEnd || !wo.plannedEnd || new Date(wo.actualEnd) <= new Date(wo.plannedEnd)) {
        entry.onTime++;
      }
      deptComplianceMap.set(dId, entry);
    }

    const byDepartment = departmentBreakdown.map((d) => {
      const dept = deptNameMap.get(d.departmentId!);
      const compliance = deptComplianceMap.get(d.departmentId!);
      return {
        departmentId: d.departmentId,
        departmentName: dept?.name || 'Unknown',
        departmentCode: dept?.code || '—',
        scheduleCount: d._count.id,
        completedWos: compliance?.total || 0,
        complianceRate: compliance && compliance.total > 0
          ? Math.round((compliance.onTime / compliance.total) * 100)
          : null,
      };
    });

    // ── Build monthly trend (ensure all 12 months present) ──
    const trendMap = new Map(monthlyData.map((m) => [m.month, m]));
    const monthlyTrend: Array<{ month: string; generated: number; completed: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const existing = trendMap.get(key);
      monthlyTrend.push({
        month: key,
        generated: existing?.generated || 0,
        completed: existing?.completed || 0,
      });
    }

    // ── Build final response ──
    return NextResponse.json({
      success: true,
      data: {
        complianceRate,
        overdueCount: overdueSchedules,
        upcomingCount: upcomingSchedules,
        totalSchedules,
        totalGenerated: pmWorkOrders.length,
        avgCompletionDays,
        byDepartment,
        monthlyTrend,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load PM analytics';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
