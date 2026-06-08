import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { getPlantScope, getPlantFilterWhere } from '@/lib/plant-scope';
import { Prisma } from '@prisma/client';

// Prevent caching — dashboard data changes frequently
export const dynamic = 'force-dynamic';

/**
 * Wrap a promise with a fallback value so a single failing query
 * doesn't crash the entire dashboard response.
 */
function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  return p.catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[dashboard:stats] Query failed, using fallback:', msg);
    return fallback;
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'dashboard.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const isAdm = isAdmin(session);

    // Resolve plant scope for multi-plant data isolation
    const plantScope = await getPlantScope(request, session);
    const plantFilter = getPlantFilterWhere(plantScope);

    // Build base where clauses for role-based filtering
    const mrWhere: Record<string, unknown> = { ...plantFilter };
    const woWhere: Record<string, unknown> = { ...plantFilter };

    // Track supervised departments for reuse (pending-count and dashboard pending queries)
    let supervisedDeptIds: string[] = [];

    if (session && !isAdm) {
      // Non-admin: show own items or items assigned to them
      if (session.roles.includes('maintenance_technician')) {
        (woWhere as Record<string, unknown>).assignedTo = session.userId;
        (mrWhere as Record<string, unknown>).requestedBy = session.userId;
      } else if (session.roles.includes('production_operator')) {
        (mrWhere as Record<string, unknown>).requestedBy = session.userId;
        // Operators only see WOs created from their requests
        const myMRIds = await db.maintenanceRequest.findMany({
          where: { requestedBy: session.userId },
          select: { id: true },
        });
        if (myMRIds.length > 0) {
          (woWhere as Record<string, unknown>).maintenanceRequestId = { in: myMRIds.map(mr => mr.id) };
        } else {
          // No MRs, so no WOs to show
          (woWhere as Record<string, unknown>).id = '__none__';
        }
      } else if (session.roles.includes('maintenance_supervisor')) {
        // Supervisors see requests from their supervised departments AND explicitly assigned to them
        const supervisedDepts = await db.department.findMany({
          where: { supervisorId: session.userId },
          select: { id: true },
        });
        supervisedDeptIds = supervisedDepts.map(d => d.id);
        if (supervisedDeptIds.length > 0) {
          (mrWhere as Record<string, unknown>).OR = [
            { supervisorId: session.userId },
            { departmentId: { in: supervisedDeptIds } },
          ];
        } else {
          (mrWhere as Record<string, unknown>).supervisorId = session.userId;
        }
      }
      // Planners and admins see everything
    }

    // Build role-based where clause for pending requests (NO plant filter — matches pending-count API)
    // Supervisors, managers, and admins see ALL pending+approved requests (they need visibility into all actionable items)
    let pendingMrWhere: Record<string, unknown>;
    const isSupervisorLike = isAdm || session.roles.includes('maintenance_supervisor') || session.roles.includes('maintenance_manager') || session.roles.includes('plant_manager');
    const isPlannerRole = session.roles.includes('maintenance_planner');

    if (isAdm || isSupervisorLike) {
      // Admins, supervisors, managers, plant managers — see ALL pending+approved requests
      pendingMrWhere = { status: { in: ['pending', 'approved'] } };
    } else if (isPlannerRole) {
      // Planners only need to see approved (ready for planning/assignment)
      pendingMrWhere = { status: 'approved' };
    } else {
      // Technicians, operators — only their own requests
      pendingMrWhere = { status: { in: ['pending', 'approved'] }, requestedBy: session.userId };
    }

    // Today's start for trend queries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Helper: generate array of last 7 day dates
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().slice(0, 10));
    }

    // Helper: fill a day-count map into a 7-element array matching last7Days
    function fillTrendArray(dayCounts: { day: string; count: number }[]): number[] {
      const map = new Map(dayCounts.map((r) => [r.day, r.count]));
      return last7Days.map((d) => map.get(d) || 0);
    }

    // Date boundaries for this month and last month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Merge plant filter into raw SQL where clause if scoped
    const plantSqlFilter = plantScope.isScoped && plantScope.plantId
      ? Prisma.sql` AND plantId = ${plantScope.plantId}`
      : Prisma.sql``;

    const emptyAggregate = { _sum: { totalCost: 0, laborCost: 0, partsCost: 0, contractorCost: 0 }, _count: 0 };
    const emptyWoList: { id: string; actualStart: Date | null; actualEnd: Date | null; actualHours: number | null; updatedAt: Date; type: string }[] = [];

    const [
      mrByStatus,
      woByStatus,
      totalMR,
      totalWO,
      pendingApprovals,
      overdueWorkOrders,
      createdTodayMR,
      completedTodayWO,
      createdTodayWO,
      recentRequests,
      recentWorkOrders,
      // Asset health
      assetPoorCount,
      assetCriticalCount,
      assetTotalCount,
      assetByCondition,
      // Safety alerts
      safetyOpenIncidents,
      safetyOverdueInspections,
      // Production
      productionActiveOrders,
      productionOverdueOrders,
      productionTotalCompleted,
      productionTotalAll,
      // IoT status
      iotTotalDevices,
      iotOfflineCount,
      iotAlertCount,
      // Quality
      qualityOpenNcrs,
      qualityFailedInspections,
      qualityPendingAudits,
      // Inventory alerts
      inventoryLowStockItems,
      inventoryPendingRequests,
      // Weekly trends (raw SQL)
      weeklyWoResult,
      weeklyMrResult,
      weeklyProdResult,
      // ===== Enhanced KPIs =====
      // Maintenance KPIs: MTBF, MTTR, planned vs reactive
      completedWOsForKPI,
      preventiveWOsForKPI,
      correctiveWOsForKPI,
      // PM schedules
      pmSchedulesDue,
      pmSchedulesOverdue,
      // Cost analysis: this month vs last month
      thisMonthCostResult,
      lastMonthCostResult,
      costByTypeResult,
      // My assigned work orders (for technician/supervisor dashboards)
      myActiveWOs,
      myPendingTasks,
      myCompletedThisWeek,
      // Tools checked out (for technicians)
      myToolsCheckedOut,
      // Team workload (for supervisors)
      teamPendingApprovals,
      teamActiveWOs,
      // Planning queue (for planners)
      planningQueueWOs,
      // Pending team member requests (for planner/admin)
      pendingTeamRequests,
      // Pending team requests detail (for dashboard)
      pendingTeamRequestsDetail,
      // Recent notifications count
      unreadNotifications,
      // WO type breakdown for donut chart
      preventiveWO,
      correctiveWO,
      emergencyWO,
      inspectionWO,
      predictiveWO,
      // Priority breakdown for MR
      highPriorityMR,
      mediumPriorityMR,
      lowPriorityMR,
      // Role-based actionable requests (pending + approved)
      roleBasedPending,
      newTodayPending,
    ] = await Promise.all([
      // MR counts by status
      safe(db.maintenanceRequest.groupBy({
        by: ['status'],
        _count: { status: true },
        where: Object.keys(mrWhere).length > 0 ? mrWhere : undefined,
      }), []),
      // WO counts by status
      safe(db.workOrder.groupBy({
        by: ['status'],
        _count: { status: true },
        where: Object.keys(woWhere).length > 0 ? woWhere : undefined,
      }), []),
      // Total MR count
      safe(db.maintenanceRequest.count({
        where: Object.keys(mrWhere).length > 0 ? mrWhere : undefined,
      }), 0),
      // Total WO count
      safe(db.workOrder.count({
        where: Object.keys(woWhere).length > 0 ? woWhere : undefined,
      }), 0),
      // Pending approvals (requests in 'pending' or 'in_progress' workflow)
      safe(db.maintenanceRequest.count({
        where: {
          ...plantFilter,
          status: { in: ['pending', 'in_progress'] },
        },
      }), 0),
      // Overdue WOs (past planned end and not completed/closed/cancelled)
      safe(db.workOrder.count({
        where: {
          ...plantFilter,
          plannedEnd: { lt: new Date() },
          status: { notIn: ['completed', 'closed', 'cancelled'] },
        },
      }), 0),
      // Today's counts for trends
      safe(db.maintenanceRequest.count({
        where: { ...plantFilter, createdAt: { gte: todayStart } },
      }), 0),
      safe(db.workOrder.count({
        where: { ...plantFilter, updatedAt: { gte: todayStart }, status: 'completed' },
      }), 0),
      safe(db.workOrder.count({
        where: { ...plantFilter, createdAt: { gte: todayStart } },
      }), 0),
      // Recent activity — also filtered by role
      safe(db.maintenanceRequest.findMany({
        where: Object.keys(mrWhere).length > 0 ? mrWhere : plantFilter,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { id: true, fullName: true, username: true } },
        },
      }), []),
      safe(db.workOrder.findMany({
        where: Object.keys(woWhere).length > 0 ? woWhere : plantFilter,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: { select: { id: true, fullName: true } },
          assigner: { select: { id: true, fullName: true } },
        },
      }), []),
      // Asset health: poor condition
      safe(db.asset.count({ where: { condition: 'poor', isActive: true, ...plantFilter } }), 0),
      // Asset health: critical criticality
      safe(db.asset.count({ where: { criticality: 'critical', isActive: true, ...plantFilter } }), 0),
      // Asset total
      safe(db.asset.count({ where: { isActive: true, ...plantFilter } }), 0),
      // Asset by condition breakdown
      safe(db.asset.groupBy({
        by: ['condition'],
        _count: { condition: true },
        where: { isActive: true, ...plantFilter },
      }), []),
      // Safety: open incidents (open + investigating)
      safe(db.safetyIncident.count({ where: { ...plantFilter, status: { in: ['open', 'investigating'] } } }), 0),
      // Safety: overdue inspections (scheduled date past, not completed/failed)
      safe(db.safetyInspection.count({
        where: {
          ...plantFilter,
          scheduledDate: { lt: new Date() },
          status: { notIn: ['completed', 'failed'] },
        },
      }), 0),
      // Production: active orders (in_progress)
      safe(db.productionOrder.count({ where: { ...plantFilter, status: 'in_progress' } }), 0),
      // Production: overdue orders (past scheduled end, not completed/cancelled)
      safe(db.productionOrder.count({
        where: {
          ...plantFilter,
          scheduledEnd: { lt: new Date() },
          status: { notIn: ['completed', 'cancelled'] },
        },
      }), 0),
      // Production: completed orders for rate calculation
      safe(db.productionOrder.count({ where: { ...plantFilter, status: 'completed' } }), 0),
      // Production: total orders
      safe(db.productionOrder.count({ where: { ...plantFilter } }), 0),
      // IoT: total devices
      safe(db.iotDevice.count({ where: { ...plantFilter } }), 0),
      // IoT: offline devices
      safe(db.iotDevice.count({ where: { ...plantFilter, status: 'offline' } }), 0),
      // IoT: active/new alerts
      safe(db.iotAlert.count({ where: { ...plantFilter, status: 'active' } }), 0),
      // Quality: open NCRs (open + investigating + root_cause_found + corrective_action)
      safe(db.nonConformanceReport.count({ where: { ...plantFilter, status: { in: ['open', 'investigating'] } } }), 0),
      // Quality: failed inspections
      safe(db.qualityInspection.count({ where: { ...plantFilter, status: 'failed' } }), 0),
      // Quality: pending audits (planned + in_progress)
      safe(db.qualityAudit.count({ where: { ...plantFilter, status: { in: ['planned', 'in_progress'] } } }), 0),
      // Inventory: low stock items
      safe(db.inventoryItem.findMany({
        where: { isActive: true, ...plantFilter },
        select: { id: true, currentStock: true, minStockLevel: true },
      }), []),
      // Inventory: pending requests
      safe(db.inventoryRequest.count({ where: { ...plantFilter, status: { in: ['pending', 'partially_fulfilled'] } } }), 0),
      // Weekly trends: work orders created per day (MySQL-compatible, with plant filter)
      safe(db.$queryRaw(Prisma.sql`SELECT DATE(createdAt) as day, COUNT(*) as count FROM work_orders WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)${plantSqlFilter} GROUP BY DATE(createdAt) ORDER BY day`), []),
      // Weekly trends: maintenance requests created per day (MySQL-compatible, with plant filter)
      safe(db.$queryRaw(Prisma.sql`SELECT DATE(createdAt) as day, COUNT(*) as count FROM maintenance_requests WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)${plantSqlFilter} GROUP BY DATE(createdAt) ORDER BY day`), []),
      // Weekly trends: production orders created per day (MySQL-compatible, with plant filter)
      safe(db.$queryRaw(Prisma.sql`SELECT DATE(createdAt) as day, COUNT(*) as count FROM production_orders WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)${plantSqlFilter} GROUP BY DATE(createdAt) ORDER BY day`), []),
      // ===== Enhanced KPIs =====
      // Completed WOs with actual hours for MTBF/MTTR
      safe(db.workOrder.findMany({
        where: { ...plantFilter, status: { in: ['completed', 'closed'] }, actualEnd: { not: null }, actualStart: { not: null } },
        select: { id: true, actualStart: true, actualEnd: true, actualHours: true, updatedAt: true, type: true },
        orderBy: { actualEnd: 'desc' },
        take: 200,
      }), emptyWoList),
      // Preventive vs corrective count for planned ratio
      safe(db.workOrder.count({ where: { ...plantFilter, type: 'preventive' } }), 0),
      safe(db.workOrder.count({ where: { ...plantFilter, type: { in: ['corrective', 'emergency'] } } }), 0),
      // PM schedules due (nextDueDate within 7 days)
      safe(db.pmSchedule.count({
        where: {
          ...plantFilter,
          isActive: true,
          nextDueDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        },
      }), 0),
      // PM schedules overdue
      safe(db.pmSchedule.count({
        where: {
          ...plantFilter,
          isActive: true,
          nextDueDate: { lt: new Date() },
        },
      }), 0),
      // This month cost
      safe(db.workOrder.aggregate({
        where: { ...plantFilter, createdAt: { gte: thisMonthStart }, status: { notIn: ['cancelled'] } },
        _sum: { totalCost: true, laborCost: true, partsCost: true, contractorCost: true },
        _count: true,
      }), emptyAggregate),
      // Last month cost
      safe(db.workOrder.aggregate({
        where: { ...plantFilter, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: { notIn: ['cancelled'] } },
        _sum: { totalCost: true, laborCost: true, partsCost: true, contractorCost: true },
        _count: true,
      }), emptyAggregate),
      // Cost by WO type
      safe(db.workOrder.groupBy({
        by: ['type'],
        _sum: { totalCost: true, laborCost: true, partsCost: true },
        where: { ...plantFilter, status: { notIn: ['cancelled', 'draft'] } },
      }), []),
      // My active WOs (assigned to me, not terminal)
      safe(db.workOrder.count({
        where: {
          ...plantFilter,
          assignedTo: session.userId,
          status: { in: ['assigned', 'in_progress', 'waiting_parts', 'on_hold'] },
        },
      }), 0),
      // My pending tasks (MRs I submitted that are pending, or WOs assigned to me in assigned status)
      safe(db.maintenanceRequest.count({
        where: { ...plantFilter, requestedBy: session.userId, status: { in: ['pending', 'in_progress', 'approved'] } },
      }), 0),
      // My completed this week
      safe(db.workOrder.count({
        where: {
          ...plantFilter,
          assignedTo: session.userId,
          status: 'completed',
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }), 0),
      // Tools checked out by me
      safe(db.tool.count({
        where: { status: 'checked_out', assignedToId: session.userId },
      }), 0),
      // Team pending approvals (for supervisors)
      isAdm || session.roles.includes('maintenance_supervisor')
        ? safe(db.maintenanceRequest.count({
            where: { ...plantFilter, status: { in: ['pending', 'in_progress'] } },
          }), 0)
        : Promise.resolve(0),
      // Team active WOs (for supervisors)
      isAdm || session.roles.includes('maintenance_supervisor')
        ? safe(db.workOrder.count({
            where: { ...plantFilter, status: { in: ['assigned', 'in_progress', 'waiting_parts'] } },
          }), 0)
        : Promise.resolve(0),
      // Planning queue (for planners)
      isAdm || session.roles.includes('maintenance_planner')
        ? safe(db.workOrder.count({
            where: { ...plantFilter, status: { in: ['draft', 'approved', 'requested'] } },
          }), 0)
        : Promise.resolve(0),
      // Pending team member requests (for planner/admin — count WOs where current user is planner or assigner)
      isAdm || session.roles.includes('maintenance_planner')
        ? safe(db.woTeamMemberRequest.count({
            where: {
              status: 'pending',
              ...(isAdm ? {} : { OR: [
                { workOrder: { plannerId: session.userId } },
                { workOrder: { assignedBy: session.userId } },
              ]}),
            },
          }), 0)
        : Promise.resolve(0),
      // Pending team requests detail (WO number + trade) for dashboard cards
      isAdm || session.roles.includes('maintenance_planner')
        ? safe(db.woTeamMemberRequest.findMany({
            where: {
              status: 'pending',
              ...(isAdm ? {} : { OR: [
                { workOrder: { plannerId: session.userId } },
                { workOrder: { assignedBy: session.userId } },
              ]}),
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              workOrder: { select: { id: true, woNumber: true, title: true } },
              requestedByUser: { select: { id: true, fullName: true } },
            },
          }), [])
        : Promise.resolve([]),
      // Unread notification count
      safe(db.notification.count({
        where: { userId: session.userId, isRead: false },
      }), 0),
      // WO type breakdown for donut chart
      safe(db.workOrder.count({ where: { ...plantFilter, type: 'preventive' } }), 0),
      safe(db.workOrder.count({ where: { ...plantFilter, type: 'corrective' } }), 0),
      safe(db.workOrder.count({ where: { ...plantFilter, type: 'emergency' } }), 0),
      safe(db.workOrder.count({ where: { ...plantFilter, type: 'inspection' } }), 0),
      safe(db.workOrder.count({ where: { ...plantFilter, type: 'predictive' } }), 0),
      // Priority breakdown for MR
      safe(db.maintenanceRequest.count({ where: { ...plantFilter, priority: { in: ['high', 'urgent'] } } }), 0),
      safe(db.maintenanceRequest.count({ where: { ...plantFilter, priority: 'medium' } }), 0),
      safe(db.maintenanceRequest.count({ where: { ...plantFilter, priority: 'low' } }), 0),
      // Role-based: pending + approved requests (actionable by current user, no plant filter)
      safe(db.maintenanceRequest.count({ where: pendingMrWhere }), 0),
      // Role-based: new today (pending + approved created today, no plant filter)
      safe(db.maintenanceRequest.count({ where: { ...pendingMrWhere, createdAt: { gte: todayStart } } }), 0),
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

    // Completed WOs
    const completedWorkOrders = woStats['completed'] || 0;

    // Calculate low stock from inventory items
    const lowStock = inventoryLowStockItems.filter(
      (i) => i.currentStock <= i.minStockLevel && i.minStockLevel > 0,
    ).length;

    // Calculate production completion rate
    const productionCompletionRate = productionTotalAll > 0
      ? Math.round((productionTotalCompleted / productionTotalAll) * 100)
      : 0;

    // Build weekly trend arrays
    const weeklyTrends = {
      workOrders: fillTrendArray(weeklyWoResult as { day: string; count: number }[]),
      maintenanceRequests: fillTrendArray(weeklyMrResult as { day: string; count: number }[]),
      productionOrders: fillTrendArray(weeklyProdResult as { day: string; count: number }[]),
    };

    // ===== Compute Enhanced KPIs =====

    // MTTR (Mean Time To Repair) in hours: avg of actualHours for completed WOs
    const wosWithActualHours = completedWOsForKPI.filter(w => w.actualHours && w.actualHours > 0);
    const mttr = wosWithActualHours.length > 0
      ? Math.round((wosWithActualHours.reduce((sum, w) => sum + (w.actualHours || 0), 0) / wosWithActualHours.length) * 10) / 10
      : 0;

    // MTBF (Mean Time Between Failures) in hours: avg time between completed corrective/emergency WOs
    const failureWOs = completedWOsForKPI
      .filter(w => w.type === 'corrective' || w.type === 'emergency')
      .filter(w => w.actualEnd && w.actualStart)
      .sort((a, b) => new Date(a.actualEnd!).getTime() - new Date(b.actualEnd!).getTime());
    let mtbf = 0;
    if (failureWOs.length >= 2) {
      let totalHours = 0;
      for (let i = 1; i < failureWOs.length; i++) {
        const diff = new Date(failureWOs[i].actualEnd!).getTime() - new Date(failureWOs[i - 1].actualEnd!).getTime();
        totalHours += diff / (1000 * 60 * 60);
      }
      mtbf = Math.round(totalHours / (failureWOs.length - 1));
    } else if (failureWOs.length === 1) {
      // Use 30-day window as denominator
      const diff = Date.now() - new Date(failureWOs[0].actualEnd!).getTime();
      mtbf = Math.round(diff / (1000 * 60 * 60));
    }

    // Planned vs reactive ratio
    const totalMaintWOs = preventiveWOsForKPI + correctiveWOsForKPI;
    const plannedRatio = totalMaintWOs > 0
      ? Math.round((preventiveWOsForKPI / totalMaintWOs) * 100)
      : 0;

    // Asset condition breakdown
    const assetConditionMap: Record<string, number> = {};
    assetByCondition.forEach((r) => {
      assetConditionMap[r.condition] = r._count.condition;
    });

    // Cost analysis
    const thisMonthTotal = thisMonthCostResult._sum.totalCost || 0;
    const lastMonthTotal = lastMonthCostResult._sum.totalCost || 0;
    const costChangePercent = lastMonthTotal > 0
      ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
      : thisMonthTotal > 0 ? 100 : 0;

    const costByCategory: Record<string, { totalCost: number; laborCost: number; partsCost: number }> = {};
    costByTypeResult.forEach((r) => {
      costByCategory[r.type] = {
        totalCost: r._sum.totalCost || 0,
        laborCost: r._sum.laborCost || 0,
        partsCost: r._sum.partsCost || 0,
      };
    });

    // User roles for frontend role detection
    const userRoles = session.roles || [];

    return NextResponse.json({
      success: true,
      data: {
        totalWorkOrders: totalWO,
        activeWorkOrders,
        completedWorkOrders,
        overdueWorkOrders,
        pendingRequests: roleBasedPending,
        pendingApprovals,
        totalRequests: totalMR,
        // Trends
        createdTodayMR,
        newTodayPending,
        createdTodayWO,
        completedTodayWO,
        // MR breakdown (aliased for frontend)
        approvedRequests: mrStats['approved'] || 0,
        rejectedRequests: mrStats['rejected'] || 0,
        convertedRequests: mrStats['converted'] || 0,
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
        // WO type breakdown for donut chart
        preventiveWO,
        correctiveWO,
        emergencyWO,
        inspectionWO,
        predictiveWO,
        // Priority breakdown for MR
        highPriorityMR,
        mediumPriorityMR,
        lowPriorityMR,
        // Recent items
        recentRequests,
        recentWorkOrders,

        // ===== Cross-Module KPIs =====
        assetHealth: {
          poor: assetPoorCount,
          critical: assetCriticalCount,
          total: assetTotalCount,
          byCondition: assetConditionMap,
        },
        safetyAlerts: {
          openIncidents: safetyOpenIncidents,
          overdueInspections: safetyOverdueInspections,
        },
        production: {
          activeOrders: productionActiveOrders,
          overdueOrders: productionOverdueOrders,
          completionRate: productionCompletionRate,
        },
        iotStatus: {
          totalDevices: iotTotalDevices,
          offlineCount: iotOfflineCount,
          alertCount: iotAlertCount,
        },
        quality: {
          openNcrs: qualityOpenNcrs,
          failedInspections: qualityFailedInspections,
          pendingAudits: qualityPendingAudits,
        },
        inventoryAlerts: {
          lowStock: lowStock,
          pendingRequests: inventoryPendingRequests,
        },
        weeklyTrends,

        // ===== Enhanced KPIs =====

        // Maintenance KPIs
        maintenanceKPIs: {
          mtbf, // hours between failures
          mttr, // hours to repair
          plannedRatio, // % planned vs reactive
          preventiveCount: preventiveWOsForKPI,
          reactiveCount: correctiveWOsForKPI,
        },

        // PM Schedules
        pmScheduleAlerts: {
          dueSoon: pmSchedulesDue - pmSchedulesOverdue,
          overdue: pmSchedulesOverdue,
        },

        // Cost Analysis
        costAnalysis: {
          thisMonthTotal: Math.round(thisMonthTotal * 100) / 100,
          lastMonthTotal: Math.round(lastMonthTotal * 100) / 100,
          changePercent: costChangePercent,
          thisMonthLabor: Math.round((thisMonthCostResult._sum.laborCost || 0) * 100) / 100,
          thisMonthParts: Math.round((thisMonthCostResult._sum.partsCost || 0) * 100) / 100,
          thisMonthContractor: Math.round((thisMonthCostResult._sum.contractorCost || 0) * 100) / 100,
          byCategory: costByCategory,
        },

        // ===== Role-Based Personal KPIs =====
        myKPIs: {
          activeWorkOrders: myActiveWOs,
          pendingTasks: myPendingTasks,
          completedThisWeek: myCompletedThisWeek,
          toolsCheckedOut: myToolsCheckedOut,
          unreadNotifications,
        },

        // Supervisor KPIs
        supervisorKPIs: {
          pendingApprovals: teamPendingApprovals,
          teamActiveWOs,
        },

        // Planner KPIs
        plannerKPIs: {
          planningQueue: planningQueueWOs,
          pmSchedulesDue: pmSchedulesDue,
          pendingTeamRequests,
        },
        // Pending team requests detail
        pendingTeamRequestsDetail,

        // User roles for frontend
        userRoles,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard stats';
    console.error('[dashboard:stats] Fatal error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
