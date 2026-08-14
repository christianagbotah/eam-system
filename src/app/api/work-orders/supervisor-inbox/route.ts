import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPermission, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPlantScope, applyPlantScope, getPlantFilterWhere } from '@/lib/plant-scope';

/**
 * GET /api/work-orders/supervisor-inbox
 *
 * Returns a consolidated supervisor work queue with counts for:
 *  - Awaiting verification (completed WOs)
 *  - Rework jobs (WOs with reworkCount > 0)
 *  - Pending assistance requests
 *  - Pending tool approvals
 *  - Pending material approvals
 *  - SLA risks (past planned end, not terminal)
 *  - Critical/urgent active WOs
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
      !hasAnyPermission(session, [
        'work_orders.view',
        'work_orders.view_all',
        'work_orders.assign_supervisor',
      ]) &&
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

    // Build the base plant-scoped where clause for WorkOrder queries
    const woWhere: Record<string, unknown> = {};
    applyPlantScope(woWhere, plantScope);

    // Build a nested plant-scoped clause for WoTeamMemberRequest
    // (this model has no plantId — must filter via the related workOrder)
    const tmrPlantFilter = getPlantFilterWhere(plantScope);

    const results: Record<string, number> = {};

    // 1. Completed WOs awaiting verification
    results.awaitingVerification = await db.workOrder.count({
      where: { ...woWhere, status: 'completed' },
    });

    // 2. Rework jobs (WOs in progress with reworkCount > 0 in RepairCompletion)
    results.reworkJobs = await db.workOrder.count({
      where: {
        ...woWhere,
        status: 'in_progress',
        repairCompletion: { reworkCount: { gt: 0 } },
      },
    });

    // 3. Pending assistance requests (WoTeamMemberRequest has no plantId,
    //    so filter through the workOrder relation)
    results.pendingAssistance = await db.woTeamMemberRequest.count({
      where: {
        status: 'pending',
        workOrder: tmrPlantFilter,
      },
    });

    // 4. Pending tool approvals (RepairToolRequest has plantId)
    const toolWhere: Record<string, unknown> = { status: 'pending' };
    applyPlantScope(toolWhere, plantScope);
    results.pendingToolApprovals = await db.repairToolRequest.count({
      where: toolWhere,
    });

    // 5. Pending material approvals (RepairMaterialRequest has plantId)
    const materialWhere: Record<string, unknown> = { status: 'pending' };
    applyPlantScope(materialWhere, plantScope);
    results.pendingMaterialApprovals = await db.repairMaterialRequest.count({
      where: materialWhere,
    });

    // 6. SLA risks (WOs past planned end but not in terminal status)
    results.slaRisks = await db.workOrder.count({
      where: {
        ...woWhere,
        plannedEnd: { lt: new Date() },
        status: { notIn: ['completed', 'verified', 'closed', 'cancelled'] },
      },
    });

    // 7. Critical/priority WOs in progress
    results.criticalActive = await db.workOrder.count({
      where: {
        ...woWhere,
        status: 'in_progress',
        priority: { in: ['critical', 'urgent'] },
      },
    });

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load supervisor inbox';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
