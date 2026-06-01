import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

const VALID_ACTIONS = ['start', 'pause', 'resume', 'complete'];

// GET /api/work-orders/[id]/time-logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeTeamLogs = searchParams.get('includeTeamLogs') === 'true';

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // By default, only return logs for the current user
    const where: Record<string, unknown> = { workOrderId: id };

    if (!includeTeamLogs) {
      where.userId = session.userId;
    }

    // Try full query with loggedBy/isTeamLog support; fallback if columns don't exist
    let timeLogs;
    try {
      timeLogs = await db.workOrderTimeLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, username: true, avatar: true } },
          ...(includeTeamLogs ? {
            loggedBy: { select: { id: true, fullName: true, username: true } },
          } : {}),
        },
        orderBy: { timestamp: 'asc' },
      });
    } catch {
      // Fallback: loggedById column may not exist yet
      timeLogs = await db.workOrderTimeLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, username: true, avatar: true } },
        },
        orderBy: { timestamp: 'asc' },
      });
    }

    // Calculate summary — guard against isTeamLog being undefined
    const totalHours = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const teamLogs = timeLogs.filter((log) => (log as Record<string, unknown>).isTeamLog === true);
    const personalLogs = timeLogs.filter((log) => (log as Record<string, unknown>).isTeamLog !== true);

    return NextResponse.json({
      success: true,
      data: {
        timeLogs,
        summary: {
          totalEntries: timeLogs.length,
          totalHours: Math.round(totalHours * 100) / 100,
          personalEntries: personalLogs.length,
          personalHours: Math.round(personalLogs.reduce((s, l) => s + (l.duration || 0), 0) * 100) / 100,
          teamEntries: teamLogs.length,
          teamHours: Math.round(teamLogs.reduce((s, l) => s + (l.duration || 0), 0) * 100) / 100,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch time logs';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

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
    const body = await request.json();
    const { action, notes, hoursWorked, loggedForUserId, isTeamLog } = body;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 },
      );
    }

    const wo = await db.workOrder.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true } },
        teamLeader: { select: { id: true } },
        teamMembers: { select: { userId: true, role: true } },
      },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked) {
      return NextResponse.json({ success: false, error: 'Work order is permanently locked. No modifications are allowed after planner closure.' }, { status: 400 });
    }

    // Resolve the effective user ID and team log state
    let effectiveUserId = session.userId;
    let effectiveIsTeamLog = Boolean(isTeamLog);
    let effectiveLoggedById: string | null = null;

    if (loggedForUserId) {
      // Prevent logging for yourself via this mechanism
      if (loggedForUserId === session.userId) {
        effectiveIsTeamLog = false;
      } else {
        effectiveIsTeamLog = true;

        // Only the team leader or admin can log time for other team members
        const isTeamLeader = wo.teamLeaderId === session.userId;
        const isAdminRole = session.roles.includes('admin');

        if (!isTeamLeader && !isAdminRole) {
          return NextResponse.json(
            { success: false, error: 'Only the team leader or admin can log time for other team members' },
            { status: 403 },
          );
        }

        // Verify the target user is a team member or the assignee
        const isTargetMember = wo.teamMembers.some((m) => m.userId === loggedForUserId);
        const isTargetAssignee = wo.assignedTo === loggedForUserId;

        if (!isTargetMember && !isTargetAssignee) {
          return NextResponse.json(
            { success: false, error: 'Target user is not a team member or assignee of this work order' },
            { status: 400 },
          );
        }

        effectiveUserId = loggedForUserId;
        effectiveLoggedById = session.userId;
      }
    }

    const now = new Date();

    // Build WO update data based on action
    const woUpdateData: Record<string, unknown> = {};
    let logDuration: number | null = null;

    if (action === 'start') {
      if (!wo.actualStart) {
        woUpdateData.actualStart = now;
      }
      if (hoursWorked !== undefined && hoursWorked !== null) {
        logDuration = typeof hoursWorked === 'number' ? Math.round(hoursWorked * 100) / 100 : null;
      }
    }

    if (action === 'resume') {
      if (hoursWorked !== undefined && hoursWorked !== null) {
        logDuration = typeof hoursWorked === 'number' ? Math.round(hoursWorked * 100) / 100 : null;
      }
    }

    if (action === 'pause') {
      // Calculate duration: time since last "start" or "resume" action for this user
      const lastActiveLog = await db.workOrderTimeLog.findFirst({
        where: {
          workOrderId: id,
          userId: effectiveUserId,
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
      if (!wo.actualEnd) {
        woUpdateData.actualEnd = now;
      }

      // Calculate total duration from all time log entries for this user
      const allLogs = await db.workOrderTimeLog.findMany({
        where: { workOrderId: id, userId: effectiveUserId },
        orderBy: { timestamp: 'asc' },
      });

      let totalHours = 0;

      for (const log of allLogs) {
        if (log.duration) {
          totalHours += log.duration;
        }
      }

      const lastLog = allLogs.length > 0 ? allLogs[allLogs.length - 1] : null;
      if (lastLog && (lastLog.action === 'start' || lastLog.action === 'resume') && !lastLog.duration) {
        const elapsedMs = now.getTime() - new Date(lastLog.timestamp).getTime();
        const elapsedHours = Math.round((elapsedMs / (1000 * 60 * 60)) * 100) / 100;
        totalHours += elapsedHours;
        logDuration = elapsedHours;
      }

      if (hoursWorked !== undefined && hoursWorked !== null && typeof hoursWorked === 'number') {
        logDuration = Math.round(hoursWorked * 100) / 100;
        let recalcTotal = 0;
        for (const log of allLogs) {
          if (log.duration) {
            recalcTotal += log.duration;
          }
        }
        recalcTotal += logDuration;
        totalHours = recalcTotal;
      }

      // For team logs, we don't update the WO's actualHours directly
      // Only update actualHours if this is the primary user's time
      if (!effectiveIsTeamLog) {
        woUpdateData.actualHours = Math.round(totalHours * 100) / 100;
      }
    }

    // For start/resume/pause with logDuration (non-team logs), update actualHours
    if (logDuration !== null && action !== 'complete' && !effectiveIsTeamLog) {
      const existingLogs = await db.workOrderTimeLog.findMany({
        where: { workOrderId: id, userId: effectiveUserId },
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

    // Create time log entry — use raw SQL fallback if loggedById/isTeamLog columns don't exist yet
    let timeLog;
    try {
      timeLog = await db.workOrderTimeLog.create({
        data: {
          workOrderId: id,
          userId: effectiveUserId,
          action,
          duration: logDuration,
          notes: notes || null,
          timestamp: now,
          loggedById: effectiveLoggedById,
          isTeamLog: effectiveIsTeamLog,
        },
        include: {
          user: { select: { id: true, fullName: true, username: true, avatar: true } },
          loggedBy: { select: { id: true, fullName: true, username: true } },
        },
      });
    } catch {
      // Fallback: columns loggedById/isTeamLog may not exist on VPS yet
      timeLog = await db.workOrderTimeLog.create({
        data: {
          workOrderId: id,
          userId: effectiveUserId,
          action,
          duration: logDuration,
          notes: notes || null,
          timestamp: now,
        },
        include: {
          user: { select: { id: true, fullName: true, username: true, avatar: true } },
        },
      });
    }

    // Audit log
    await createAuditLog(session.userId, 'wo_time_log', 'create', timeLog.id, {
      newValues: {
        workOrderId: id,
        userId: effectiveUserId,
        action,
        duration: logDuration,
        notes: notes || undefined,
        isTeamLog: effectiveIsTeamLog,
        loggedById: effectiveLoggedById || undefined,
        woUpdates: woUpdateData,
      },
    });

    return NextResponse.json({ success: true, data: timeLog }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create time log';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
