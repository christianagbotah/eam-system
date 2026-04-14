import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { getPlantScope, getPlantFilterWhere } from '@/lib/plant-scope';
import { Prisma } from '@prisma/client';

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
        // Supervisors see their department's requests
        (mrWhere as Record<string, unknown>).supervisorId = session.userId;
      }
      // Planners and admins see everything
    }

    const [
      mrByStatus,
      woByStatus,
      totalMR,
      totalWO,
      pendingApprovals,
    ] = await Promise.all([
      // MR counts by status
      db.maintenanceRequest.groupBy({
        by: ['status'],
        _count: { status: true },
        where: Object.keys(mrWhere).length > 0 ? mrWhere : undefined,
      }),
      // WO counts by status
      db.workOrder.groupBy({
        by: ['status'],
        _count: { status: true },
        where: Object.keys(woWhere).length > 0 ? woWhere : undefined,
      }),
      // Total MR count
      db.maintenanceRequest.count({
        where: Object.keys(mrWhere).length > 0 ? mrWhere : undefined,
      }),
      // Total WO count
      db.workOrder.count({
        where: Object.keys(woWhere).length > 0 ? woWhere : undefined,
      }),
      // Pending approvals (requests in 'pending' or 'in_progress' workflow)
      db.maintenanceRequest.count({
        where: {
          ...plantFilter,
          status: { in: ['pending', 'in_progress'] },
        },
      }),
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

    // Overdue WOs (past planned end and not completed/closed/cancelled)
    const overdueWorkOrders = await db.workOrder.count({
      where: {
        ...plantFilter,
        plannedEnd: { lt: new Date() },
        status: { notIn: ['completed', 'closed', 'cancelled'] },
      },
    });

    // Today's counts for trends
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const createdTodayMR = await db.maintenanceRequest.count({
      where: { ...plantFilter, createdAt: { gte: todayStart } },
    });

    const completedTodayWO = await db.workOrder.count({
      where: { ...plantFilter, updatedAt: { gte: todayStart }, status: 'completed' },
    });

    const createdTodayWO = await db.workOrder.count({
      where: { ...plantFilter, createdAt: { gte: todayStart } },
    });

    // Pending requests
    const pendingRequests = mrStats['pending'] || 0;

    // Recent activity — also filtered by role
    const recentRequests = await db.maintenanceRequest.findMany({
      where: Object.keys(mrWhere).length > 0 ? mrWhere : plantFilter,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, fullName: true, username: true } },
      },
    });

    const recentWorkOrders = await db.workOrder.findMany({
      where: Object.keys(woWhere).length > 0 ? woWhere : plantFilter,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { select: { id: true, fullName: true } },
        assigner: { select: { id: true, fullName: true } },
      },
    });

    // ===== Cross-Module KPI Data =====

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

    const [
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

      // Recent notifications count
      unreadNotifications,
    ] = await Promise.all([
      // Asset health: poor condition
      db.asset.count({ where: { condition: 'poor', isActive: true, ...plantFilter } }),
      // Asset health: critical criticality
      db.asset.count({ where: { criticality: 'critical', isActive: true, ...plantFilter } }),
      // Asset total
      db.asset.count({ where: { isActive: true, ...plantFilter } }),
      // Asset by condition breakdown
      db.asset.groupBy({
        by: ['condition'],
        _count: { condition: true },
        where: { isActive: true, ...plantFilter },
      }),

      // Safety: open incidents (open + investigating)
      db.safetyIncident.count({ where: { ...plantFilter, status: { in: ['open', 'investigating'] } } }),
      // Safety: overdue inspections (scheduled date past, not completed/failed)
      db.safetyInspection.count({
        where: {
          ...plantFilter,
          scheduledDate: { lt: new Date() },
          status: { notIn: ['completed', 'failed'] },
        },
      }),

      // Production: active orders (in_progress)
      db.productionOrder.count({ where: { ...plantFilter, status: 'in_progress' } }),
      // Production: overdue orders (past scheduled end, not completed/cancelled)
      db.productionOrder.count({
        where: {
          ...plantFilter,
          scheduledEnd: { lt: new Date() },
          status: { notIn: ['completed', 'cancelled'] },
        },
      }),
      // Production: completed orders for rate calculation
      db.productionOrder.count({ where: { ...plantFilter, status: 'completed' } }),
      // Production: total orders
      db.productionOrder.count({ where: { ...plantFilter } }),

      // IoT: total devices
      db.iotDevice.count({ where: { ...plantFilter } }),
      // IoT: offline devices
      db.iotDevice.count({ where: { ...plantFilter, status: 'offline' } }),
      // IoT: active/new alerts
      db.iotAlert.count({ where: { ...plantFilter, status: 'active' } }),

      // Quality: open NCRs (open + investigating + root_cause_found + corrective_action)
      db.nonConformanceReport.count({ where: { ...plantFilter, status: { in: ['open', 'investigating'] } } }),
      // Quality: failed inspections
      db.qualityInspection.count({ where: { ...plantFilter, status: 'failed' } }),
      // Quality: pending audits (planned + in_progress)
      db.qualityAudit.count({ where: { ...plantFilter, status: { in: ['planned', 'in_progress'] } } }),

      // Inventory: low stock items
      db.inventoryItem.findMany({
        where: { isActive: true, ...plantFilter },
        select: { id: true, currentStock: true, minStockLevel: true },
      }),
      // Inventory: pending requests
      db.inventoryRequest.count({ where: { ...plantFilter, status: { in: ['pending', 'partially_fulfilled'] } } }),

      // Weekly trends: work orders created per day
      db.$queryRaw(Prisma.sql`SELECT date(createdAt) as day, COUNT(*) as count FROM work_orders WHERE createdAt >= date('now', '-6 days') GROUP BY date(createdAt) ORDER BY day`),
      // Weekly trends: maintenance requests created per day
      db.$queryRaw(Prisma.sql`SELECT date(createdAt) as day, COUNT(*) as count FROM maintenance_requests WHERE createdAt >= date('now', '-6 days') GROUP BY date(createdAt) ORDER BY day`),
      // Weekly trends: production orders created per day
      db.$queryRaw(Prisma.sql`SELECT date(createdAt) as day, COUNT(*) as count FROM production_orders WHERE createdAt >= date('now', '-6 days') GROUP BY date(createdAt) ORDER BY day`),

      // ===== Enhanced KPIs =====

      // Completed WOs with actual hours for MTBF/MTTR
      db.workOrder.findMany({
        where: { ...plantFilter, status: { in: ['completed', 'closed'] }, actualEnd: { not: null }, actualStart: { not: null } },
        select: { id: true, actualStart: true, actualEnd: true, actualHours: true, completedAt: true, type: true },
        orderBy: { actualEnd: 'desc' },
        take: 200,
      }),

      // Preventive vs corrective count for planned ratio
      db.workOrder.count({ where: { ...plantFilter, type: 'preventive' } }),
      db.workOrder.count({ where: { ...plantFilter, type: { in: ['corrective', 'emergency'] } } }),

      // PM schedules due (nextDueDate within 7 days)
      db.pmSchedule.count({
        where: {
          ...plantFilter,
          isActive: true,
          nextDueDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),

      // PM schedules overdue
      db.pmSchedule.count({
        where: {
          ...plantFilter,
          isActive: true,
          nextDueDate: { lt: new Date() },
        },
      }),

      // This month cost
      db.workOrder.aggregate({
        where: { ...plantFilter, createdAt: { gte: thisMonthStart }, status: { notIn: ['cancelled'] } },
        _sum: { totalCost: true, laborCost: true, partsCost: true, contractorCost: true },
        _count: true,
      }),

      // Last month cost
      db.workOrder.aggregate({
        where: { ...plantFilter, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: { notIn: ['cancelled'] } },
        _sum: { totalCost: true, laborCost: true, partsCost: true, contractorCost: true },
        _count: true,
      }),

      // Cost by WO type
      db.workOrder.groupBy({
        by: ['type'],
        _sum: { totalCost: true, laborCost: true, partsCost: true },
        where: { ...plantFilter, status: { notIn: ['cancelled', 'draft'] } },
      }),

      // My active WOs (assigned to me, not terminal)
      db.workOrder.count({
        where: {
          ...plantFilter,
          assignedTo: session.userId,
          status: { in: ['assigned', 'in_progress', 'waiting_parts', 'on_hold'] },
        },
      }),

      // My pending tasks (MRs I submitted that are pending, or WOs assigned to me in assigned status)
      db.maintenanceRequest.count({
        where: { ...plantFilter, requestedBy: session.userId, status: { in: ['pending', 'in_progress', 'approved'] } },
      }),

      // My completed this week
      db.workOrder.count({
        where: {
          ...plantFilter,
          assignedTo: session.userId,
          status: 'completed',
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),

      // Tools checked out by me
      db.tool.count({
        where: { status: 'checked_out', assignedToId: session.userId },
      }),

      // Team pending approvals (for supervisors)
      isAdm || session.roles.includes('maintenance_supervisor')
        ? db.maintenanceRequest.count({
            where: { ...plantFilter, status: { in: ['pending', 'in_progress'] } },
          })
        : Promise.resolve(0),

      // Team active WOs (for supervisors)
      isAdm || session.roles.includes('maintenance_supervisor')
        ? db.workOrder.count({
            where: { ...plantFilter, status: { in: ['assigned', 'in_progress', 'waiting_parts'] } },
          })
        : Promise.resolve(0),

      // Planning queue (for planners)
      isAdm || session.roles.includes('maintenance_planner')
        ? db.workOrder.count({
            where: { ...plantFilter, status: { in: ['draft', 'approved', 'requested'] } },
          })
        : Promise.resolve(0),

      // Unread notification count
      db.notification.count({
        where: { userId: session.userId, isRead: false },
      }),
    ]);

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
      workOrders: fillTrendArray(weeklyWoResult),
      maintenanceRequests: fillTrendArray(weeklyMrResult),
      productionOrders: fillTrendArray(weeklyProdResult),
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
        pendingRequests,
        pendingApprovals,
        totalRequests: totalMR,
        // Trends
        createdTodayMR,
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
        preventiveWO: await db.workOrder.count({ where: { ...plantFilter, type: 'preventive' } }),
        correctiveWO: await db.workOrder.count({ where: { ...plantFilter, type: 'corrective' } }),
        emergencyWO: await db.workOrder.count({ where: { ...plantFilter, type: 'emergency' } }),
        inspectionWO: await db.workOrder.count({ where: { ...plantFilter, type: 'inspection' } }),
        predictiveWO: await db.workOrder.count({ where: { ...plantFilter, type: 'predictive' } }),
        // Priority breakdown for MR
        highPriorityMR: await db.maintenanceRequest.count({ where: { ...plantFilter, priority: { in: ['high', 'urgent'] } } }),
        mediumPriorityMR: await db.maintenanceRequest.count({ where: { ...plantFilter, priority: 'medium' } }),
        lowPriorityMR: await db.maintenanceRequest.count({ where: { ...plantFilter, priority: 'low' } }),
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
        },

        // User roles for frontend
        userRoles,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard stats';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
