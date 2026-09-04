import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, isAdmin } from '@/lib/auth';
import { buildAuditData } from '@/lib/audit-helpers';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';

const MANUAL_LABOR_ACTIONS = ['start', 'resume'] as const;
const VALID_ACTIVITY_TYPES = ['maintenance', 'travel', 'inspection', 'testing', 'standby', 'other'];
const IMMUTABLE_TIME_STATUSES = ['completed', 'verified', 'closed', 'cancelled'];

function calcDurationHours(start: Date | string, end: Date | string, breakMinutes: number = 0): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalMinutes = ms / 60000 - breakMinutes;
  return Math.max(0, Math.round((totalMinutes / 60) * 100) / 100);
}

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
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

    const canView = hasAnyPermission(session, ['work_orders.view_own', 'work_orders.view_all']) || isAdmin(session);
    if (!canView) {
      return NextResponse.json({ success: false, error: 'You do not have permission to view time logs' }, { status: 403 });
    }

    const { id } = await params;
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    const { searchParams } = new URL(request.url);
    const includeTeamLogs = searchParams.get('includeTeamLogs') === 'true';

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

    const isAssignee = wo.assignedTo === session.userId;
    const isTeamMember = wo.teamMembers.some((member) => member.userId === session.userId);
    const isTeamLeader = wo.teamLeaderId === session.userId;
    if (!isAssignee && !isTeamMember && !isTeamLeader && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'You do not have access to this work order' }, { status: 403 });
    }

    if (includeTeamLogs) {
      const canViewTeamLogs =
        isAdmin(session) ||
        hasAnyPermission(session, ['work_orders.view_all', 'time_logs.view_team']) ||
        isTeamLeader;
      if (!canViewTeamLogs) {
        return NextResponse.json({ success: false, error: 'Insufficient permissions to view team time logs' }, { status: 403 });
      }
    }

    const where: Record<string, unknown> = { workOrderId: id };
    if (!includeTeamLogs) where.userId = session.userId;

    let timeLogs;
    try {
      timeLogs = await db.workOrderTimeLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, username: true, avatar: true } },
          ...(includeTeamLogs
            ? { loggedBy: { select: { id: true, fullName: true, username: true } } }
            : {}),
        },
        orderBy: { timestamp: 'asc' },
      });
    } catch (error) {
      console.warn('[time-logs] Schema migration fallback for GET (loggedBy include):', error);
      timeLogs = await db.workOrderTimeLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, username: true, avatar: true } },
        },
        orderBy: { timestamp: 'asc' },
      });
    }

    const totalHours = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const totalBreakMinutes = timeLogs.reduce((sum, log) => sum + (log.breakMinutes || 0), 0);
    const teamLogs = timeLogs.filter((log) => (log as Record<string, unknown>).isTeamLog === true);
    const personalLogs = timeLogs.filter((log) => (log as Record<string, unknown>).isTeamLog !== true);

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
          personalHours: Math.round(personalLogs.reduce((sum, log) => sum + (log.duration || 0), 0) * 100) / 100,
          teamEntries: teamLogs.length,
          teamHours: Math.round(teamLogs.reduce((sum, log) => sum + (log.duration || 0), 0) * 100) / 100,
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
// POST — create a CLOSED retrospective/manual labor entry only
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

    const canCreate = hasAnyPermission(session, ['work_orders.update', 'time_logs.create']) || isAdmin(session);
    if (!canCreate) {
      return NextResponse.json({ success: false, error: 'You do not have permission to create time logs' }, { status: 403 });
    }

    const { id } = await params;
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    const body = await request.json();
    const {
      action,
      notes,
      loggedForUserId,
      isTeamLog,
      startTime: startTimeStr,
      endTime: endTimeStr,
      activityType = 'maintenance',
      breakMinutes = 0,
      manualHours,
    } = body;

    if (action === 'pause' || action === 'complete') {
      return NextResponse.json(
        {
          success: false,
          error: action === 'pause'
            ? 'Live pause/hold is a work-order lifecycle action. Use the work-order hold/waiting endpoint instead of creating a time-log event.'
            : 'Completion is a work-order lifecycle action. Use the Repairs completion workflow instead of creating a time-log event.',
        },
        { status: 400 },
      );
    }

    if (!MANUAL_LABOR_ACTIONS.includes(action)) {
      return NextResponse.json(
        { success: false, error: "Manual labor action must be 'start' or 'resume'." },
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

    const isAssignee = wo.assignedTo === session.userId;
    const isTeamMember = wo.teamMembers.some((member) => member.userId === session.userId);
    const isTeamLeader = wo.teamLeaderId === session.userId;
    if (!isAssignee && !isTeamMember && !isTeamLeader && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'You do not have access to this work order' }, { status: 403 });
    }

    if (wo.isLocked || IMMUTABLE_TIME_STATUSES.includes(wo.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Time records cannot be changed after completion/review/closure. Work order status: ${wo.status}`,
        },
        { status: 400 },
      );
    }

    let effectiveUserId = session.userId;
    let effectiveIsTeamLog = Boolean(isTeamLog);

    if (loggedForUserId) {
      if (loggedForUserId === session.userId) {
        effectiveIsTeamLog = false;
      } else {
        const canLogForOthers = isTeamLeader || isAdmin(session);
        if (!canLogForOthers) {
          return NextResponse.json(
            { success: false, error: 'Only the team leader or admin can log time for other team members' },
            { status: 403 },
          );
        }
        const isTargetMember = wo.teamMembers.some((member) => member.userId === loggedForUserId);
        const isTargetAssignee = wo.assignedTo === loggedForUserId;
        if (!isTargetMember && !isTargetAssignee) {
          return NextResponse.json(
            { success: false, error: 'Target user is not a team member or assignee' },
            { status: 400 },
          );
        }
        effectiveUserId = loggedForUserId;
        effectiveIsTeamLog = true;
      }
    }

    const safeBreak = Math.max(0, Math.min(Number(breakMinutes) || 0, 480));
    const suppliedManualHours = Number(manualHours);
    const hasManualHours = Number.isFinite(suppliedManualHours) && suppliedManualHours > 0;
    const hasExplicitWindow = Boolean(startTimeStr && endTimeStr);

    if (!hasManualHours && !hasExplicitWindow) {
      return NextResponse.json(
        {
          success: false,
          error: 'This endpoint accepts closed retrospective labor entries only. Provide manualHours or both startTime and endTime. Use Start/Resume/Hold for live execution.',
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const startTime = startTimeStr ? new Date(startTimeStr) : now;
    if (!isValidDate(startTime)) {
      return NextResponse.json({ success: false, error: 'Invalid startTime' }, { status: 400 });
    }

    let endTime: Date;
    let duration: number;

    if (hasExplicitWindow) {
      endTime = new Date(endTimeStr);
      if (!isValidDate(endTime)) {
        return NextResponse.json({ success: false, error: 'Invalid endTime' }, { status: 400 });
      }
      if (endTime <= startTime) {
        return NextResponse.json({ success: false, error: 'End time must be after start time' }, { status: 400 });
      }
      duration = calcDurationHours(startTime, endTime, safeBreak);
    } else {
      const grossMinutes = suppliedManualHours * 60;
      endTime = new Date(startTime.getTime() + grossMinutes * 60_000);
      duration = Math.max(0, Math.round((suppliedManualHours - safeBreak / 60) * 100) / 100);
    }

    if (duration <= 0) {
      return NextResponse.json(
        { success: false, error: 'Labor duration must be greater than zero after break time is applied' },
        { status: 400 },
      );
    }

    const timeLog = await db.$transaction(async (tx) => {
      const created = await tx.workOrderTimeLog.create({
        data: {
          workOrderId: id,
          userId: effectiveUserId,
          action,
          duration,
          notes: notes || null,
          timestamp: now,
          // A non-null loggedById marks this row as an explicit manual entry.
          // Canonical live execution services do not populate loggedById.
          loggedById: session.userId,
          isTeamLog: effectiveIsTeamLog,
          startTime,
          endTime,
          activityType: activityType || 'maintenance',
          breakMinutes: safeBreak,
          pauseReason: null,
        },
        include: {
          user: { select: { id: true, fullName: true, username: true, avatar: true } },
          loggedBy: { select: { id: true, fullName: true, username: true } },
        },
      });

      const aggregate = await tx.workOrderTimeLog.aggregate({
        where: { workOrderId: id },
        _sum: { duration: true },
      });
      const actualHours = Math.round((aggregate._sum.duration || 0) * 100) / 100;
      await tx.workOrder.update({ where: { id }, data: { actualHours } });

      await tx.auditLog.create({
        data: buildAuditData(
          'create',
          'wo_time_log',
          created.id,
          session.userId,
          undefined,
          {
            workOrderId: id,
            userId: effectiveUserId,
            action,
            duration,
            activityType: activityType || 'maintenance',
            breakMinutes: safeBreak,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            notes: notes || undefined,
            isTeamLog: effectiveIsTeamLog,
            loggedById: session.userId,
            source: 'manual_retrospective',
          },
        ),
      });

      return created;
    });

    return NextResponse.json({ success: true, data: timeLog }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create time log';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// DELETE — delete manual time corrections only; execution sessions are immutable
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

    const canDelete = hasAnyPermission(session, ['work_orders.update', 'time_logs.delete']) || isAdmin(session);
    if (!canDelete) {
      return NextResponse.json({ success: false, error: 'You do not have permission to delete time logs' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('logId');
    if (!logId) {
      return NextResponse.json({ success: false, error: 'logId is required' }, { status: 400 });
    }

    const timeLog = await db.workOrderTimeLog.findUnique({
      where: { id: logId },
      include: {
        workOrder: { select: { id: true, isLocked: true, teamLeaderId: true, status: true } },
      },
    });

    if (!timeLog || timeLog.workOrderId !== id) {
      return NextResponse.json({ success: false, error: 'Time log not found' }, { status: 404 });
    }

    if (timeLog.workOrder.isLocked || IMMUTABLE_TIME_STATUSES.includes(timeLog.workOrder.status)) {
      return NextResponse.json(
        { success: false, error: 'Work order has completed/reviewed records. Time log changes are no longer allowed.' },
        { status: 400 },
      );
    }

    // Canonical execution rows have no loggedById. They are operational audit
    // records and must never be hard-deleted through the manual correction API.
    if (!timeLog.loggedById) {
      return NextResponse.json(
        { success: false, error: 'System-managed execution sessions cannot be deleted from the manual time-log endpoint.' },
        { status: 400 },
      );
    }

    const isWorker = timeLog.userId === session.userId;
    const isLogger = timeLog.loggedById === session.userId;
    const isTeamLeader = timeLog.workOrder.teamLeaderId === session.userId;
    const isAdminUser = session.roles.includes('admin');
    if (!isWorker && !isLogger && !isTeamLeader && !isAdminUser) {
      return NextResponse.json(
        { success: false, error: 'Only the worker, manual-entry logger, team leader, or admin can delete this manual time record' },
        { status: 403 },
      );
    }

    await db.$transaction(async (tx) => {
      await tx.workOrderTimeLog.delete({ where: { id: logId } });

      const aggregate = await tx.workOrderTimeLog.aggregate({
        where: { workOrderId: id },
        _sum: { duration: true },
      });
      const actualHours = Math.round((aggregate._sum.duration || 0) * 100) / 100;
      await tx.workOrder.update({ where: { id }, data: { actualHours } });

      await tx.auditLog.create({
        data: buildAuditData(
          'delete',
          'wo_time_log',
          logId,
          session.userId,
          {
            userId: timeLog.userId,
            action: timeLog.action,
            duration: timeLog.duration,
            startTime: timeLog.startTime?.toISOString(),
            endTime: timeLog.endTime?.toISOString(),
            loggedById: timeLog.loggedById,
          },
          { deletedBy: session.userId, source: 'manual_time_correction' },
        ),
      });
    });

    return NextResponse.json({ success: true, message: 'Manual time log deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete time log';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
