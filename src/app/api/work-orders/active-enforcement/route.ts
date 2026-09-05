import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPlantScope } from '@/lib/plant-scope';

// GET /api/work-orders/active-enforcement
// For a given technician (session user), check if they have any WO in 'in_progress'
// with an unclosed time log (start/resume without subsequent pause).
// Enforces: technician can only work on one WO at a time.
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Get all work orders assigned to this user that are 'in_progress'
    const inProgressWorkOrders = await db.workOrder.findMany({
      where: {
        assignedTo: session.userId,
        status: 'in_progress',
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        teamLeader: { select: { id: true, fullName: true } },
        assignedSupervisor: { select: { id: true, fullName: true } },
        _count: {
          select: {
            teamMembers: true,
            materials: true,
          },
        },
      },
      orderBy: { actualStart: 'asc' },
    });

    // Also check WOs where user is a team member
    const teamMemberWorkOrders = await db.workOrderTeamMember.findMany({
      where: {
        userId: session.userId,
        workOrder: { status: 'in_progress' },
      },
      include: {
        workOrder: {
          include: {
            assignee: { select: { id: true, fullName: true } },
            asset: { select: { id: true, name: true, assetTag: true } },
            teamLeader: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    // Combine unique WOs
    const allActiveWos = new Map<string, typeof inProgressWorkOrders[0]>();
    for (const wo of inProgressWorkOrders) {
      allActiveWos.set(wo.id, wo);
    }
    for (const tm of teamMemberWorkOrders) {
      if (!allActiveWos.has(tm.workOrder.id)) {
        allActiveWos.set(tm.workOrder.id, tm.workOrder as unknown as typeof inProgressWorkOrders[0]);
      }
    }

    const activeWos = [...allActiveWos.values()];

    // Check for unclosed time logs on each WO
    const woWithTimeStatus = await Promise.all(
      activeWos.map(async (wo) => {
        // Find the latest time log for this user on this WO
        const latestLog = await db.workOrderTimeLog.findFirst({
          where: {
            workOrderId: wo.id,
            userId: session.userId,
          },
          orderBy: { timestamp: 'desc' },
        });

        // Check if the user has an unclosed session (start/resume without pause/complete)
        let hasUnclosedLog = false;
        let lastAction = null;
        let unclosedSince = null;

        if (latestLog) {
          lastAction = latestLog.action;
          if (latestLog.action === 'start' || latestLog.action === 'resume') {
            hasUnclosedLog = true;
            unclosedSince = latestLog.timestamp;
          }
        }

        // Calculate total hours logged
        const allLogs = await db.workOrderTimeLog.findMany({
          where: { workOrderId: wo.id, userId: session.userId },
        });
        const totalHours = allLogs.reduce((sum, log) => sum + (log.duration || 0), 0);

        return {
          id: wo.id,
          woNumber: wo.woNumber,
          title: wo.title,
          type: wo.type,
          priority: wo.priority,
          actualStart: wo.actualStart,
          estimatedHours: wo.estimatedHours,
          asset: wo.asset,
          teamLeader: wo.teamLeader,
          _count: wo._count,
          timeTracking: {
            lastAction,
            hasUnclosedLog,
            unclosedSince,
            totalHours: Math.round(totalHours * 100) / 100,
          },
        };
      }),
    );

    // Find the WO with an active (unclosed) time log
    const activeWorkOrder = woWithTimeStatus.find((wo) => wo.timeTracking.hasUnclosedLog) || null;

    // Count total WOs with unclosed logs (should normally be 0 or 1)
    const wosWithUnclosedLogs = woWithTimeStatus.filter((wo) => wo.timeTracking.hasUnclosedLog);

    const hasActiveWO = wosWithUnclosedLogs.length > 0;

    let message = '';
    if (hasActiveWO) {
      if (wosWithUnclosedLogs.length > 1) {
        message = `Warning: You have ${wosWithUnclosedLogs.length} work orders with unclosed time logs. Please close the active session on one before starting another.`;
      } else {
        message = `You have an active work session on ${activeWorkOrder?.woNumber}: "${activeWorkOrder?.title}". Please pause or complete this session before starting another work order.`;
      }
    } else if (activeWos.length > 0) {
      message = `You have ${activeWos.length} in-progress work order(s) but no active time session.`;
    } else {
      message = 'No active work orders. You are free to start a new work order.';
    }

    return NextResponse.json({
      success: true,
      data: {
        hasActiveWO,
        activeWorkOrder,
        allInProgressWos: woWithTimeStatus,
        message,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check active work order enforcement';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
