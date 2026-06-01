import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ============================================================================
// GET — check if the current user has an active (running) time session
//        across ALL work orders. An active session is the last time log entry
//        with action "start" or "resume" that has NOT been followed by
//        "pause" or "complete".
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Find the user's most recent time log entry across ALL work orders
    const latestLog = await db.workOrderTimeLog.findFirst({
      where: { userId: session.userId },
      orderBy: { timestamp: 'desc' },
      include: {
        workOrder: {
          select: {
            id: true,
            woNumber: true,
            title: true,
            status: true,
          },
        },
        user: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    // No time logs at all → no active session
    if (!latestLog) {
      return NextResponse.json({
        success: true,
        data: { hasActive: false, session: null },
      });
    }

    // If the latest entry is start or resume → active session
    if (latestLog.action === 'start' || latestLog.action === 'resume') {
      const startedAt = latestLog.startTime || latestLog.timestamp;
      const elapsedMs = Date.now() - new Date(startedAt).getTime();
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const elapsedSeconds = Math.floor(elapsedMs / 1000);

      return NextResponse.json({
        success: true,
        data: {
          hasActive: true,
          session: {
            workOrderId: latestLog.workOrderId,
            workOrderNumber: latestLog.workOrder?.woNumber || 'N/A',
            workOrderTitle: latestLog.workOrder?.title || '',
            workOrderStatus: latestLog.workOrder?.status || '',
            action: latestLog.action,
            startedAt: startedAt.toISOString(),
            elapsedSeconds,
            elapsedMinutes,
            logId: latestLog.id,
            activityType: latestLog.activityType || 'maintenance',
          },
        },
      });
    }

    // Latest entry is pause or complete → no active session
    return NextResponse.json({
      success: true,
      data: { hasActive: false, session: null },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check active session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
