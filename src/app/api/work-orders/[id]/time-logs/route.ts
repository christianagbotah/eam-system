import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const VALID_ACTIONS = ['start', 'pause', 'resume', 'complete'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, notes, hoursWorked } = body;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked && !session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Work order is locked' }, { status: 400 });
    }

    const now = new Date();

    // Build WO update data based on action
    const woUpdateData: Record<string, unknown> = {};
    let logDuration: number | null = null;

    if (action === 'start') {
      // Set actualStart if not already set
      if (!wo.actualStart) {
        woUpdateData.actualStart = now;
      }
      // Accept manual hoursWorked for start action
      if (hoursWorked !== undefined && hoursWorked !== null) {
        logDuration = typeof hoursWorked === 'number' ? Math.round(hoursWorked * 100) / 100 : null;
      }
    }

    if (action === 'resume') {
      // Accept manual hoursWorked for resume action
      if (hoursWorked !== undefined && hoursWorked !== null) {
        logDuration = typeof hoursWorked === 'number' ? Math.round(hoursWorked * 100) / 100 : null;
      }
    }

    if (action === 'pause') {
      // Calculate duration: time since last "start" or "resume" action
      const lastActiveLog = await db.workOrderTimeLog.findFirst({
        where: {
          workOrderId: id,
          action: { in: ['start', 'resume'] },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (lastActiveLog) {
        const elapsedMs = now.getTime() - new Date(lastActiveLog.timestamp).getTime();
        logDuration = Math.round((elapsedMs / (1000 * 60 * 60)) * 100) / 100;
      }
    }

    if (action === 'complete') {
      // Set actualEnd
      if (!wo.actualEnd) {
        woUpdateData.actualEnd = now;
      }

      // Calculate total duration from all time log entries
      // Sum up all pause/complete durations, plus elapsed time for any unclosed start/resume
      const allLogs = await db.workOrderTimeLog.findMany({
        where: { workOrderId: id },
        orderBy: { timestamp: 'asc' },
      });

      let totalHours = 0;

      // Sum existing durations from pause/complete entries
      for (const log of allLogs) {
        if (log.duration) {
          totalHours += log.duration;
        }
      }

      // If there's an unclosed start/resume (no subsequent pause), calculate elapsed time
      const lastLog = allLogs.length > 0 ? allLogs[allLogs.length - 1] : null;
      if (lastLog && (lastLog.action === 'start' || lastLog.action === 'resume') && !lastLog.duration) {
        const elapsedMs = now.getTime() - new Date(lastLog.timestamp).getTime();
        const elapsedHours = Math.round((elapsedMs / (1000 * 60 * 60)) * 100) / 100;
        totalHours += elapsedHours;
        logDuration = elapsedHours;
      }

      // Also account for manual hoursWorked if provided
      if (hoursWorked !== undefined && hoursWorked !== null && typeof hoursWorked === 'number') {
        // If hoursWorked is provided for complete, use it as the duration for this entry
        logDuration = Math.round(hoursWorked * 100) / 100;
        // Recalculate total: sum all existing log durations + this one
        let recalcTotal = 0;
        for (const log of allLogs) {
          if (log.duration) {
            recalcTotal += log.duration;
          }
        }
        recalcTotal += logDuration;
        totalHours = recalcTotal;
      }

      woUpdateData.actualHours = Math.round(totalHours * 100) / 100;
    }

    // For start/resume/pause with logDuration, also update actualHours on the WO
    if (logDuration !== null && action !== 'complete') {
      const existingLogs = await db.workOrderTimeLog.findMany({
        where: { workOrderId: id },
      });
      let currentTotal = 0;
      for (const log of existingLogs) {
        if (log.duration) {
          currentTotal += log.duration;
        }
      }
      currentTotal += logDuration;
      woUpdateData.actualHours = Math.round(currentTotal * 100) / 100;
    }

    // Update work order if there are changes
    if (Object.keys(woUpdateData).length > 0) {
      await db.workOrder.update({
        where: { id },
        data: woUpdateData,
      });
    }

    // Create time log entry
    const timeLog = await db.workOrderTimeLog.create({
      data: {
        workOrderId: id,
        userId: session.userId,
        action,
        duration: logDuration,
        notes: notes || null,
        timestamp: now,
      },
      include: {
        user: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'wo_time_log',
        entityId: timeLog.id,
        newValues: JSON.stringify({
          workOrderId: id,
          action,
          duration: logDuration,
          notes: notes || undefined,
          woUpdates: woUpdateData,
        }),
      },
    });

    return NextResponse.json({ success: true, data: timeLog }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create time log';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
