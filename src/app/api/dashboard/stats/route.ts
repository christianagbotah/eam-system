import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';
import { getPlantScope, getPlantFilterWhere } from '@/lib/plant-scope';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    const isAdm = session ? isAdmin(session) : false;

    // Resolve plant scope for multi-plant data isolation
    const plantScope = session ? await getPlantScope(request, session) : null;
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

    const [
      // Asset health
      assetPoorCount,
      assetCriticalCount,
      assetTotalCount,

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
    ] = await Promise.all([
      // Asset health: poor condition
      db.asset.count({ where: { condition: 'poor', isActive: true, ...plantFilter } }),
      // Asset health: critical criticality
      db.asset.count({ where: { criticality: 'critical', isActive: true, ...plantFilter } }),
      // Asset total
      db.asset.count({ where: { isActive: true, ...plantFilter } }),

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
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard stats';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
