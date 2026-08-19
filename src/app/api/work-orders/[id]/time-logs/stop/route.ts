import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';

/**
 * POST /api/work-orders/[id]/time-logs/stop
 *
 * Closes the current user's open execution timer without changing WO status.
 * This is the explicit timer operation used before completion/readiness checks.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    const wo = await db.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        isLocked: true,
        assignedTo: true,
        teamLeaderId: true,
        teamMembers: { select: { userId: true } },
      },
    });
    if (!wo) return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    if (wo.isLocked || wo.status === 'verified' || wo.status === 'closed') {
      return NextResponse.json({ success: false, error: 'Time logging is locked for this work order' }, { status: 400 });
    }

    const isExecutionUser =
      wo.assignedTo === session.userId ||
      wo.teamLeaderId === session.userId ||
      wo.teamMembers.some((member) => member.userId === session.userId);
    if (!isExecutionUser && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'You do not have execution access to this work order' }, { status: 403 });
    }

    const now = new Date();
    const activeLogs = await db.workOrderTimeLog.findMany({
      where: {
        workOrderId: id,
        userId: session.userId,
        action: { in: ['start', 'resume'] },
        endTime: null,
      },
      orderBy: { timestamp: 'asc' },
    });

    if (activeLogs.length === 0) {
      return NextResponse.json({ success: false, error: 'No active timer found for this work order' }, { status: 400 });
    }

    let closedHours = 0;
    await db.$transaction(async (tx) => {
      for (const log of activeLogs) {
        const startedAt = log.startTime || log.timestamp;
        const elapsedHours = Math.max(
          0,
          (now.getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60) - ((log.breakMinutes || 0) / 60),
        );
        const duration = Math.round(elapsedHours * 100) / 100;
        closedHours += duration;

        await tx.workOrderTimeLog.update({
          where: { id: log.id },
          data: {
            endTime: now,
            duration,
            notes: log.notes ? `${log.notes} | Timer stopped` : 'Timer stopped',
          },
        });
      }

      const allLogs = await tx.workOrderTimeLog.findMany({
        where: { workOrderId: id },
        select: { duration: true },
      });
      const actualHours = Math.round(
        allLogs.reduce((sum, log) => sum + (log.duration || 0), 0) * 100,
      ) / 100;

      await tx.workOrder.update({
        where: { id },
        data: { actualHours },
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'wo_timer_stop',
          entityType: 'work_order',
          entityId: id,
          newValues: JSON.stringify({
            closedTimerIds: activeLogs.map((log) => log.id),
            closedHours: Math.round(closedHours * 100) / 100,
            stoppedAt: now.toISOString(),
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        stoppedAt: now,
        closedTimers: activeLogs.length,
        closedHours: Math.round(closedHours * 100) / 100,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to stop active timer';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
