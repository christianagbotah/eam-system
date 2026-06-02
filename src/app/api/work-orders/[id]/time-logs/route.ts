import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, hasAnyPermission, isAdmin } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

const VALID_ACTIONS = ['start', 'pause', 'resume', 'complete'];
const VALID_ACTIVITY_TYPES = ['maintenance', 'travel', 'inspection', 'testing', 'standby', 'other'];

// ============================================================================
// Helper: calculate duration from start/end times minus break
// ============================================================================
function calcDurationHours(start: Date | string, end: Date | string, breakMinutes: number = 0): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalMinutes = ms / 60000 - breakMinutes;
  return Math.max(0, Math.round((totalMinutes / 60) * 100) / 100);
}

// ============================================================================
// Helper: recalculate total actualHours for a user on a WO
// ============================================================================
async function recalcWoActualHours(workOrderId: string, userId: string) {
  const logs = await db.workOrderTimeLog.findMany({
    where: { workOrderId, userId },
  });
  let total = 0;
  for (const log of logs) {
    if (log.duration) total += log.duration;
  }
  return Math.round(total * 100) / 100;
}

// ============================================================================
// GET — fetch time logs with summary
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // ── Permission gate ──
    const canView = hasAnyPermission(session, ['work_orders.view_own', 'work_orders.view_all']) || isAdmin(session);
    if (!canView) {
      return NextResponse.json({ success: false, error: 'You do not have permission to view time logs' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeTeamLogs = searchParams.get('includeTeamLogs') === 'true';

    // Fetch WO with assignment info for access validation
    const wo = await db.workOrder.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true } },
        teamLeader: { select: { id: true } },
        teamMembers: { select: { userId: true } },
      },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // ── WO-level access validation ──
    const isAssignee = wo.assignedTo === session.userId;
    const isTeamMember = wo.teamMembers.some((m) => m.userId === session.userId);
    const isTeamLeader = wo.teamLeaderId === session.userId;
    if (!isAssignee && !isTeamMember && !isTeamLeader && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'You do not have access to this work order' }, { status: 403 });
    }

    // ── Team logs: require elevated permissions or team leader role ──
    if (includeTeamLogs) {
      const canViewTeamLogs = isAdmin(session) || hasAnyPermission(session, ['work_orders.view_all', 'time_logs.view_team']) || isTeamLeader;
      if (!canViewTeamLogs) {
        return NextResponse.json({ success: false, error: 'Insufficient permissions to view team time logs' }, { status: 403 });
      }
    }

    // By default, only return logs for the current user
    const where: Record<string, unknown> = { workOrderId: id };
    if (!includeTeamLogs) {
      where.userId = session.userId;
    }

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
      timeLogs = await db.workOrderTimeLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, username: true, avatar: true } },
        },
        orderBy: { timestamp: 'asc' },
      });
    }

    // Build summary
    const totalHours = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const totalBreakMinutes = timeLogs.reduce((sum, log) => sum + (log.breakMinutes || 0), 0);
    const teamLogs = timeLogs.filter((log) => (log as Record<string, unknown>).isTeamLog === true);
    const personalLogs = timeLogs.filter((log) => (log as Record<string, unknown>).isTeamLog !== true);

    // Per-user breakdown (for team log view)
    const byUser: Record<string, { fullName: string; hours: number; entries: number }> = {};
    for (const log of timeLogs) {
      const uid = log.userId;
      const name = log.user?.fullName || 'Unknown';
      if (!byUser[uid]) byUser[uid] = { fullName: name, hours: 0, entries: 0 };
      byUser[uid].hours += log.duration || 0;
      byUser[uid].entries++;
    }

    return NextResponse.json({
      success: true,
      data: {
        timeLogs,
        summary: {
          totalEntries: timeLogs.length,
          totalHours: Math.round(totalHours * 100) / 100,
          totalBreakMinutes,
          personalEntries: personalLogs.length,
          personalHours: Math.round(personalLogs.reduce((s, l) => s + (l.duration || 0), 0) * 100) / 100,
          teamEntries: teamLogs.length,
          teamHours: Math.round(teamLogs.reduce((s, l) => s + (l.duration || 0), 0) * 100) / 100,
          byUser,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch time logs';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// POST — create a time log entry
// ============================================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // ── Permission gate ──
    const canCreate = hasAnyPermission(session, ['work_orders.edit', 'time_logs.create']) || isAdmin(session);
    if (!canCreate) {
      return NextResponse.json({ success: false, error: 'You do not have permission to create time logs' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      action,
      notes,
      loggedForUserId,
      isTeamLog,
      // Enterprise fields
      startTime: startTimeStr,
      endTime: endTimeStr,
      activityType = 'maintenance',
      breakMinutes = 0,
      manualHours,
      pauseReason,
    } = body;

    const VALID_PAUSE_REASONS = ['break', 'switch_wo', 'waiting_parts', 'other'];
    if (pauseReason && !VALID_PAUSE_REASONS.includes(pauseReason)) {
      return NextResponse.json(
        { success: false, error: `Invalid pause reason. Must be one of: ${VALID_PAUSE_REASONS.join(', ')}` },
        { status: 400 },
      );
    }

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 },
      );
    }

    if (activityType && !VALID_ACTIVITY_TYPES.includes(activityType)) {
      return NextResponse.json(
        { success: false, error: `Invalid activity type. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}` },
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

    // ── WO-level access validation ──
    const isAssignee = wo.assignedTo === session.userId;
    const isTeamMember = wo.teamMembers.some((m) => m.userId === session.userId);
    const isTeamLeader = wo.teamLeaderId === session.userId;
    if (!isAssignee && !isTeamMember && !isTeamLeader && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'You do not have access to this work order' }, { status: 403 });
    }

    if (wo.isLocked) {
      return NextResponse.json({ success: false, error: 'Work order is permanently locked.' }, { status: 400 });
    }

    // Don't allow time logging once supervisor has verified (awaiting planner closure)
    if (wo.status === 'verified' || wo.status === 'closed') {
      return NextResponse.json({ success: false, error: 'Work order has been reviewed and time logging is no longer allowed. Status: ' + wo.status }, { status: 400 });
    }

    // ── Resolve effective user (team leader logging for others) ──
    let effectiveUserId = session.userId;
    let effectiveIsTeamLog = Boolean(isTeamLog);
    let effectiveLoggedById: string | null = null;

    if (loggedForUserId) {
      if (loggedForUserId === session.userId) {
        effectiveIsTeamLog = false;
      } else {
        effectiveIsTeamLog = true;
        const isTeamLeader = wo.teamLeaderId === session.userId;
        const isAdminRole = session.roles.includes('admin');
        if (!isTeamLeader && !isAdminRole) {
          return NextResponse.json(
            { success: false, error: 'Only the team leader or admin can log time for other team members' },
            { status: 403 },
          );
        }
        const isTargetMember = wo.teamMembers.some((m) => m.userId === loggedForUserId);
        const isTargetAssignee = wo.assignedTo === loggedForUserId;
        if (!isTargetMember && !isTargetAssignee) {
          return NextResponse.json(
            { success: false, error: 'Target user is not a team member or assignee' },
            { status: 400 },
          );
        }
        effectiveUserId = loggedForUserId;
        effectiveLoggedById = session.userId;
      }
    }

    // ── ENFORCEMENT: Single active work order rule ──
    // A user can only have ONE active (running) work order at a time.
    // Active = last time log action is 'start' or 'resume' (not 'pause' or 'complete').
    if ((action === 'start' || action === 'resume') && !effectiveIsTeamLog) {
      const latestGlobalLog = await db.workOrderTimeLog.findFirst({
        where: { userId: effectiveUserId },
        orderBy: { timestamp: 'desc' },
        include: { workOrder: { select: { id: true, woNumber: true } } },
      });
      if (latestGlobalLog && (latestGlobalLog.action === 'start' || latestGlobalLog.action === 'resume')) {
        // User has an active session — check if it's on a DIFFERENT WO
        if (latestGlobalLog.workOrderId !== id) {
          return NextResponse.json({
            success: false,
            error: `You already have an active work session on WO #${latestGlobalLog.workOrder?.woNumber || 'unknown'}. Pause that work order before starting a new one.`,
            conflict: {
              workOrderId: latestGlobalLog.workOrderId,
              woNumber: latestGlobalLog.workOrder?.woNumber,
              action: latestGlobalLog.action,
              startedAt: (latestGlobalLog.startTime || latestGlobalLog.timestamp).toISOString(),
            },
          }, { status: 409 });
        }
      }
    }

    const now = new Date();

    // ── Parse start/end times ──
    const startTime = startTimeStr ? new Date(startTimeStr) : null;
    const endTime = endTimeStr ? new Date(endTimeStr) : null;

    // Validate: end must be after start
    if (startTime && endTime && endTime <= startTime) {
      return NextResponse.json(
        { success: false, error: 'End time must be after start time' },
        { status: 400 },
      );
    }

    // ── Calculate duration ──
    let logDuration: number | null = null;
    const safeBreak = Math.max(0, Math.min(breakMinutes || 0, 480)); // cap at 8h break

    // Priority 1: If both start and end provided, auto-calculate
    if (startTime && endTime) {
      logDuration = calcDurationHours(startTime, endTime, safeBreak);
    }
    // Priority 2: Manual hours override
    else if (manualHours !== undefined && manualHours !== null && typeof manualHours === 'number' && manualHours > 0) {
      logDuration = Math.round((manualHours - (safeBreak / 60)) * 100) / 100;
      if (logDuration < 0) logDuration = 0;
    }
    // Priority 3: Action-based calculation (legacy start/pause/resume/complete flow)
    else if (action === 'start') {
      // Start just records the start time, duration = null (timer running)
      if (!startTime) logDuration = null;
    } else if (action === 'pause') {
      const lastActiveLog = await db.workOrderTimeLog.findFirst({
        where: { workOrderId: id, userId: effectiveUserId, action: { in: ['start', 'resume'] } },
        orderBy: { timestamp: 'desc' },
      });
      if (lastActiveLog) {
        const ref = lastActiveLog.startTime || lastActiveLog.timestamp;
        logDuration = calcDurationHours(ref, now, safeBreak);
      }
    } else if (action === 'resume') {
      // Resume doesn't generate duration — just marks restart
      logDuration = null;
    } else if (action === 'complete') {
      const lastActiveLog = await db.workOrderTimeLog.findFirst({
        where: { workOrderId: id, userId: effectiveUserId, action: { in: ['start', 'resume'] } },
        orderBy: { timestamp: 'desc' },
      });
      if (lastActiveLog) {
        const ref = lastActiveLog.startTime || lastActiveLog.timestamp;
        logDuration = calcDurationHours(ref, endTime || now, safeBreak);
      }
    }

    // ── Update WO timestamps ──
    const woUpdateData: Record<string, unknown> = {};

    if (action === 'start' && !wo.actualStart) {
      woUpdateData.actualStart = startTime || now;
    }
    if (action === 'complete' && !wo.actualEnd) {
      woUpdateData.actualEnd = endTime || now;
    }

    // ── Update WO actualHours (non-team logs only) ──
    if (!effectiveIsTeamLog && logDuration !== null) {
      const newTotal = await recalcWoActualHours(id, effectiveUserId);
      woUpdateData.actualHours = newTotal + logDuration;
    } else if (!effectiveIsTeamLog && action === 'complete') {
      // Recalculate total for this user including this entry
      const newTotal = await recalcWoActualHours(id, effectiveUserId);
      woUpdateData.actualHours = newTotal + (logDuration || 0);
    }

    // ── Also recalculate for team leader view: sum all logs for all users ──
    if (!effectiveIsTeamLog) {
      const allLogs = await db.workOrderTimeLog.findMany({ where: { workOrderId: id } });
      let grandTotal = 0;
      for (const log of allLogs) {
        if (log.duration) grandTotal += log.duration;
      }
      woUpdateData.actualHours = Math.round((grandTotal + (logDuration || 0)) * 100) / 100;
    }

    if (Object.keys(woUpdateData).length > 0) {
      await db.workOrder.update({ where: { id }, data: woUpdateData });
    }

    // ── Create time log entry ──
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
          startTime: startTime || (action === 'start' ? now : null),
          endTime: endTime || (action === 'pause' ? now : (action === 'complete' ? now : null)),
          activityType: activityType || 'maintenance',
          breakMinutes: safeBreak,
          pauseReason: (action === 'pause') ? (pauseReason || null) : null,
        },
        include: {
          user: { select: { id: true, fullName: true, username: true, avatar: true } },
          loggedBy: { select: { id: true, fullName: true, username: true } },
        },
      });
    } catch {
      // Fallback: new columns may not exist on VPS yet
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
        },
      });
    }

    // ── Audit log ──
    await createAuditLog(session.userId, 'wo_time_log', 'create', timeLog.id, {
      newValues: {
        workOrderId: id,
        userId: effectiveUserId,
        action,
        duration: logDuration,
        activityType: activityType || 'maintenance',
        breakMinutes: safeBreak,
        startTime: startTime?.toISOString() || undefined,
        endTime: endTime?.toISOString() || undefined,
        notes: notes || undefined,
        isTeamLog: effectiveIsTeamLog,
        loggedById: effectiveLoggedById || undefined,
        pauseReason: pauseReason || undefined,
      },
    });

    return NextResponse.json({ success: true, data: timeLog }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create time log';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// DELETE — remove a time log entry (creator, team leader, or admin only)
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // ── Permission gate ──
    const canDelete = hasAnyPermission(session, ['work_orders.edit', 'time_logs.delete']) || isAdmin(session);
    if (!canDelete) {
      return NextResponse.json({ success: false, error: 'You do not have permission to delete time logs' }, { status: 403 });
    }

    const { id } = await params;
    // The logId comes from searchParams
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('logId');

    if (!logId) {
      return NextResponse.json({ success: false, error: 'logId is required' }, { status: 400 });
    }

    // Find the time log
    const timeLog = await db.workOrderTimeLog.findUnique({
      where: { id: logId },
      include: { workOrder: { select: { id: true, isLocked: true, teamLeaderId: true } } },
    });

    if (!timeLog || timeLog.workOrderId !== id) {
      return NextResponse.json({ success: false, error: 'Time log not found' }, { status: 404 });
    }

    if (timeLog.workOrder.isLocked) {
      return NextResponse.json({ success: false, error: 'Work order is locked' }, { status: 400 });
    }

    // Don't allow deleting time logs once WO has been reviewed
    const woForDelete = await db.workOrder.findUnique({ where: { id }, select: { status: true } });
    if (woForDelete && (woForDelete.status === 'verified' || woForDelete.status === 'closed')) {
      return NextResponse.json({ success: false, error: 'Work order has been reviewed. Time log changes are no longer allowed.' }, { status: 400 });
    }

    // Permission: creator, team leader, or admin
    const isCreator = timeLog.userId === session.userId;
    const isTeamLeader = timeLog.workOrder.teamLeaderId === session.userId;
    const isAdmin = session.roles.includes('admin');

    if (!isCreator && !isTeamLeader && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Only the creator, team leader, or admin can delete time logs' }, { status: 403 });
    }

    await db.workOrderTimeLog.delete({ where: { id: logId } });

    // Recalculate actualHours for the user whose log was deleted
    const newTotal = await recalcWoActualHours(id, timeLog.userId);
    // Also recalculate grand total
    const allLogs = await db.workOrderTimeLog.findMany({ where: { workOrderId: id } });
    let grandTotal = 0;
    for (const log of allLogs) {
      if (log.duration) grandTotal += log.duration;
    }
    await db.workOrder.update({
      where: { id },
      data: { actualHours: Math.round(grandTotal * 100) / 100 },
    });

    await createAuditLog(session.userId, 'wo_time_log', 'delete', logId, {
      oldValues: {
        userId: timeLog.userId,
        action: timeLog.action,
        duration: timeLog.duration,
        deletedBy: session.userId,
      },
    });

    return NextResponse.json({ success: true, message: 'Time log deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete time log';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
