import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPermission, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPlantScope, applyPlantScope } from '@/lib/plant-scope';

/**
 * GET /api/work-orders/planner-inbox
 *
 * Returns a consolidated planner closeout work queue with counts for:
 *  - Awaiting closeout (verified WOs)
 *  - Awaiting supervisor (completed WOs)
 *  - High-cost jobs (totalCost > $5,000, not closed/cancelled)
 *  - Repeat failures (assets with 3+ WOs in last 90 days)
 *  - Resource delays (WOs in waiting states)
 *  - SLA overdue (past planned end, not terminal)
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (
      !hasAnyPermission(session, ['work_orders.view', 'work_orders.view_all']) &&
      !isAdmin(session)
    ) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const where: Record<string, unknown> = {};
    applyPlantScope(where, plantScope);

    const results: Record<string, number> = {};

    // 1. Verified WOs awaiting closeout
    results.awaitingCloseout = await db.workOrder.count({
      where: { ...where, status: 'verified' },
    });

    // 2. Completed WOs awaiting supervisor review (not yet verified)
    results.awaitingSupervisor = await db.workOrder.count({
      where: { ...where, status: 'completed' },
    });

    // 3. High-cost jobs (totalCost > $5,000, not closed/cancelled)
    results.highCostJobs = await db.workOrder.count({
      where: {
        ...where,
        totalCost: { gt: 5000 },
        status: { notIn: ['closed', 'cancelled'] },
      },
    });

    // 4. Repeat failures — assets with 3+ WOs completed/verified/closed in last 90 days
    //    Note: WorkOrder has no completedAt field, so we use updatedAt as a reliable proxy
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentWos = await db.workOrder.findMany({
      where: {
        ...where,
        status: { in: ['completed', 'verified', 'closed'] },
        updatedAt: { gte: ninetyDaysAgo },
        assetId: { not: null },
      },
      select: { assetId: true },
    });

    const assetCounts = new Map<string, number>();
    for (const wo of recentWos) {
      if (wo.assetId) {
        assetCounts.set(wo.assetId, (assetCounts.get(wo.assetId) || 0) + 1);
      }
    }
    results.repeatFailures = Array.from(assetCounts.values()).filter(
      (count) => count >= 3,
    ).length;

    // 5. Resource delays (WOs in waiting states)
    results.resourceDelays = await db.workOrder.count({
      where: {
        ...where,
        status: {
          in: [
            'waiting_parts',
            'waiting_tools',
            'waiting_shutdown',
            'waiting_permit',
          ],
        },
      },
    });

    // 6. SLA overdue (past planned end, not in terminal status)
    results.overdue = await db.workOrder.count({
      where: {
        ...where,
        plannedEnd: { lt: new Date() },
        status: { notIn: ['completed', 'verified', 'closed', 'cancelled'] },
      },
    });

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load planner inbox';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
