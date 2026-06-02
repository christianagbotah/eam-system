import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasAnyPermission } from '@/lib/auth';

/**
 * GET /api/time-logs
 *
 * Dedicated time logging endpoint with aggregation, filtering, and productivity metrics.
 * Replaces the inefficient approach of loading all WOs to extract time logs.
 *
 * Query params:
 *   - from/to: date range (YYYY-MM-DD)
 *   - userId: filter by technician
 *   - workOrderId: filter by WO
 *   - activityType: filter by activity type
 *   - department: filter by department
 *   - page, limit: pagination
 *   - summary: true → return aggregated summary instead of list
 *   - export: csv → return CSV download
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Permission gate: time_logs.view/view_all or admin or supervisor roles
    const canViewAll = isAdmin(session)
      || hasAnyPermission(session, ['time_logs.view', 'time_logs.manage', 'time_logs.create', 'work_orders.view_all'])
      || session.roles.some(r => ['maintenance_supervisor', 'maintenance_manager', 'maintenance_planner', 'plant_manager', 'hr_manager', 'admin'].includes(r));

    const canViewOwn = hasAnyPermission(session, ['time_logs.view', 'time_logs.create', 'work_orders.view_own']);

    if (!canViewAll && !canViewOwn) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const userId = searchParams.get('userId');
    const workOrderId = searchParams.get('workOrderId');
    const activityType = searchParams.get('activityType');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const summary = searchParams.get('summary') === 'true';
    const exportCsv = searchParams.get('export') === 'csv';

    // Build where clause
    const where: Record<string, unknown> = {};

    // Date range filter
    if (from || to) {
      const dateFilter: Record<string, unknown> = {};
      if (from) dateFilter.gte = new Date(from + 'T00:00:00');
      if (to) dateFilter.lte = new Date(to + 'T23:59:59');
      where.timestamp = dateFilter;
    }

    // Filters
    if (userId && canViewAll) where.userId = userId;
    if (workOrderId) where.workOrderId = workOrderId;
    if (activityType) where.activityType = activityType;

    // Permission-based scoping: technicians see only their own
    if (!canViewAll && canViewOwn) {
      where.userId = session.userId;
    }

    // ── Summary mode: aggregated metrics ──
    if (summary) {
      const [allLogs, technicians] = await Promise.all([
        db.workOrderTimeLog.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          include: {
            user: { select: { id: true, fullName: true, username: true, department: true } },
            workOrder: { select: { id: true, woNumber: true, title: true, status: true, type: true, tradeActivity: true } },
          },
          orderBy: { timestamp: 'desc' },
        }),
        db.user.findMany({
          where: { status: 'active' },
          select: { id: true, fullName: true, department: true },
        }),
      ]);

      // Per-technician productivity
      const techStats: Record<string, {
        userId: string; fullName: string; department: string;
        totalHours: number; entryCount: number; woCount: number;
        maintenanceHours: number; travelHours: number; inspectionHours: number;
        testingHours: number; standbyHours: number; otherHours: number;
        avgSessionDuration: number; longestSession: number;
      }> = {};

      const woIdsPerTech = new Map<string, Set<string>>();
      const sessionsPerTech = new Map<string, number[]>();

      for (const log of allLogs) {
        const uid = log.userId;
        const name = log.user?.fullName || 'Unknown';
        const dept = log.user?.department || '';

        if (!techStats[uid]) {
          techStats[uid] = {
            userId: uid, fullName: name, department: dept,
            totalHours: 0, entryCount: 0, woCount: 0,
            maintenanceHours: 0, travelHours: 0, inspectionHours: 0,
            testingHours: 0, standbyHours: 0, otherHours: 0,
            avgSessionDuration: 0, longestSession: 0,
          };
          woIdsPerTech.set(uid, new Set());
          sessionsPerTech.set(uid, []);
        }

        const stats = techStats[uid];
        const duration = log.duration || 0;
        stats.totalHours += duration;
        stats.entryCount++;

        if (log.workOrderId) {
          woIdsPerTech.get(uid)!.add(log.workOrderId);
        }

        // Activity type breakdown
        switch (log.activityType) {
          case 'maintenance': stats.maintenanceHours += duration; break;
          case 'travel': stats.travelHours += duration; break;
          case 'inspection': stats.inspectionHours += duration; break;
          case 'testing': stats.testingHours += duration; break;
          case 'standby': stats.standbyHours += duration; break;
          default: stats.otherHours += duration; break;
        }

        if (duration > 0) {
          const sessions = sessionsPerTech.get(uid)!;
          sessions.push(duration);
        }
      }

      // Calculate derived metrics
      for (const [uid, stats] of Object.entries(techStats)) {
        stats.woCount = woIdsPerTech.get(uid)?.size || 0;
        const sessions = sessionsPerTech.get(uid) || [];
        if (sessions.length > 0) {
          stats.avgSessionDuration = Math.round((sessions.reduce((a, b) => a + b, 0) / sessions.length) * 100) / 100;
          stats.longestSession = Math.round(Math.max(...sessions) * 100) / 100;
        }
      }

      const techArray = Object.values(techStats)
        .map(t => ({
          ...t,
          totalHours: Math.round(t.totalHours * 100) / 100,
          maintenanceHours: Math.round(t.maintenanceHours * 100) / 100,
          travelHours: Math.round(t.travelHours * 100) / 100,
          inspectionHours: Math.round(t.inspectionHours * 100) / 100,
          testingHours: Math.round(t.testingHours * 100) / 100,
          standbyHours: Math.round(t.standbyHours * 100) / 100,
          otherHours: Math.round(t.otherHours * 100) / 100,
        }))
        .sort((a, b) => b.totalHours - a.totalHours);

      // Activity type breakdown (global)
      const activityBreakdown: Record<string, number> = {};
      for (const log of allLogs) {
        const act = log.activityType || 'maintenance';
        activityBreakdown[act] = (activityBreakdown[act] || 0) + (log.duration || 0);
      }
      const activityArray = Object.entries(activityBreakdown)
        .map(([activity, totalHours]) => ({ activity, totalHours: Math.round(totalHours * 100) / 100 }))
        .sort((a, b) => b.totalHours - a.totalHours);

      // By department breakdown
      const deptBreakdown: Record<string, number> = {};
      for (const [, stats] of Object.entries(techStats)) {
        const dept = stats.department || 'Unassigned';
        deptBreakdown[dept] = (deptBreakdown[dept] || 0) + stats.totalHours;
      }
      const deptArray = Object.entries(deptBreakdown)
        .map(([department, totalHours]) => ({ department, totalHours: Math.round(totalHours * 100) / 100 }))
        .sort((a, b) => b.totalHours - a.totalHours);

      // Grand totals
      const grandTotal = allLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
      const uniqueTechnicians = new Set(allLogs.map(l => l.userId)).size;
      const uniqueWOs = new Set(allLogs.filter(l => l.workOrderId).map(l => l.workOrderId)).size;

      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalHours: Math.round(grandTotal * 100) / 100,
            totalEntries: allLogs.length,
            uniqueTechnicians,
            uniqueWorkOrders: uniqueWOs,
          },
          byTechnician: techArray,
          byActivity: activityArray,
          byDepartment: deptArray,
        },
      });
    }

    // ── CSV export mode ──
    if (exportCsv) {
      const allLogs = await db.workOrderTimeLog.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          user: { select: { id: true, fullName: true, username: true, department: true } },
          workOrder: { select: { id: true, woNumber: true, title: true, status: true, type: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: 5000,
      });

      const header = 'Date,Technician,Department,WO Number,WO Title,Action,Activity Type,Duration (hrs),Break (min),Pause Reason,Notes';
      const rows = allLogs.map(log => {
        const date = log.timestamp ? new Date(log.timestamp).toISOString().slice(0, 10) : '';
        const tech = log.user?.fullName || '';
        const dept = log.user?.department || '';
        const woNum = log.workOrder?.woNumber || '';
        const woTitle = (log.workOrder?.title || '').replace(/,/g, ';');
        const action = log.action || '';
        const activity = log.activityType || '';
        const duration = String(log.duration || 0);
        const brk = String(log.breakMinutes || 0);
        const pauseReason = (log.pauseReason || '').replace(/,/g, ';');
        const notes = (log.notes || '').replace(/,/g, ';');
        return `${date},${tech},${dept},${woNum},${woTitle},${action},${activity},${duration},${brk},${pauseReason},${notes}`;
      });

      const csv = [header, ...rows].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="time-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // ── Default: paginated list ──
    const [timeLogs, total] = await Promise.all([
      db.workOrderTimeLog.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          user: { select: { id: true, fullName: true, username: true, department: true } },
          workOrder: { select: { id: true, woNumber: true, title: true, status: true, type: true } },
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.workOrderTimeLog.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: timeLogs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load time logs';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
