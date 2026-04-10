import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const session = getSession({ headers: new Headers() } as Request);
    const isAdm = session ? isAdmin(session) : false;

    // Build base where clauses for role-based filtering
    const mrWhere: Record<string, unknown> = {};
    const woWhere: Record<string, unknown> = {};

    if (session && !isAdm) {
      // Non-admin: show own items or items assigned to them
      if (session.roles.includes('technician')) {
        (woWhere as Record<string, unknown>).assignedTo = session.userId;
        (mrWhere as Record<string, unknown>).requestedBy = session.userId;
      } else if (session.roles.includes('operator')) {
        (mrWhere as Record<string, unknown>).requestedBy = session.userId;
      } else if (session.roles.includes('supervisor')) {
        // Supervisors see their department's requests
        (mrWhere as Record<string, unknown>).supervisorId = session.userId;
      }
      // Planners and admins see everything
    }

    const [
      mrByStatus,
      woByStatus,
      totalMR,
      totalWO,
      pendingApprovals,
    ] = await Promise.all([
      // MR counts by status
      db.maintenanceRequest.groupBy({
        by: ['status'],
        _count: { status: true },
        where: Object.keys(mrWhere).length > 0 ? mrWhere : undefined,
      }),
      // WO counts by status
      db.workOrder.groupBy({
        by: ['status'],
        _count: { status: true },
        where: Object.keys(woWhere).length > 0 ? woWhere : undefined,
      }),
      // Total MR count
      db.maintenanceRequest.count({
        where: Object.keys(mrWhere).length > 0 ? mrWhere : undefined,
      }),
      // Total WO count
      db.workOrder.count({
        where: Object.keys(woWhere).length > 0 ? woWhere : undefined,
      }),
      // Pending approvals (requests in 'pending' or 'in_progress' workflow)
      db.maintenanceRequest.count({
        where: {
          status: { in: ['pending', 'in_progress'] },
        },
      }),
    ]);

    const mrStats: Record<string, number> = {};
    mrByStatus.forEach((r) => {
      mrStats[r.status] = r._count.status;
    });

    const woStats: Record<string, number> = {};
    woByStatus.forEach((w) => {
      woStats[w.status] = w._count.status;
    });

    // Active WOs = in_progress + waiting_parts
    const activeWorkOrders =
      (woStats['in_progress'] || 0) + (woStats['waiting_parts'] || 0);

    // Pending requests
    const pendingRequests = mrStats['pending'] || 0;

    // Recent activity
    const recentRequests = await db.maintenanceRequest.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, fullName: true, username: true } },
      },
    });

    const recentWorkOrders = await db.workOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { select: { id: true, fullName: true } },
        assigner: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalWorkOrders: totalWO,
        activeWorkOrders,
        pendingRequests,
        pendingApprovals,
        totalRequests: totalMR,
        // MR breakdown
        pendingMR: mrStats['pending'] || 0,
        inProgressMR: mrStats['in_progress'] || 0,
        approvedMR: mrStats['approved'] || 0,
        rejectedMR: mrStats['rejected'] || 0,
        convertedMR: mrStats['converted'] || 0,
        // WO breakdown
        draftWO: woStats['draft'] || 0,
        requestedWO: woStats['requested'] || 0,
        approvedWO: woStats['approved'] || 0,
        assignedWO: woStats['assigned'] || 0,
        inProgressWO: woStats['in_progress'] || 0,
        completedWO: woStats['completed'] || 0,
        closedWO: woStats['closed'] || 0,
        // Recent items
        recentRequests,
        recentWorkOrders,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard stats';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
