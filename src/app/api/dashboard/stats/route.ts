import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [requestsByStatus, workOrdersByStatus, totalRequests, totalWorkOrders] = await Promise.all([
      db.maintenanceRequest.groupBy({ by: ['status'], _count: { status: true } }),
      db.workOrder.groupBy({ by: ['status'], _count: { status: true } }),
      db.maintenanceRequest.count(),
      db.workOrder.count(),
    ]);

    const requestStats: Record<string, number> = {};
    requestsByStatus.forEach(r => { requestStats[r.status] = r._count.status; });

    const woStats: Record<string, number> = {};
    workOrdersByStatus.forEach(w => { woStats[w.status] = w._count.status; });

    const overdueWorkOrders = await db.workOrder.count({
      where: {
        slaBreached: true,
        status: { notIn: ['completed', 'closed', 'cancelled'] },
      },
    });

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
        creator: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRequests,
        pendingRequests: requestStats['pending'] || 0,
        approvedRequests: requestStats['approved'] || 0,
        rejectedRequests: requestStats['rejected'] || 0,
        convertedRequests: requestStats['converted'] || 0,
        totalWorkOrders,
        draftWorkOrders: woStats['draft'] || 0,
        assignedWorkOrders: woStats['assigned'] || 0,
        inProgressWorkOrders: woStats['in_progress'] || 0,
        completedWorkOrders: woStats['completed'] || 0,
        closedWorkOrders: woStats['closed'] || 0,
        overdueWorkOrders,
        recentRequests,
        recentWorkOrders,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
