import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasAnyPermission } from '@/lib/auth';
import { getPlantScope, getPlantFilterWhere } from '@/lib/plant-scope';

// GET /api/reports/enterprise
// Enterprise-level maintenance report with all analytics sections
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasAnyPermission(session, ['reports.view', 'reports.export', 'analytics.view']) && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions: reports.view required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const department = searchParams.get('department');

    const plantScope = await getPlantScope(request, session);
    const plantFilter = getPlantFilterWhere(plantScope);

    // Date filter
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from + 'T00:00:00');
    if (to) dateFilter.lte = new Date(to + 'T23:59:59');

    const woWhere: Record<string, unknown> = {
      ...plantFilter,
      status: { notIn: ['cancelled'] },
    };
    if (Object.keys(dateFilter).length > 0) woWhere.createdAt = dateFilter;
    if (department) woWhere.departmentId = department;

    // Fetch WOs with joins
    const workOrders = await db.workOrder.findMany({
      where: Object.keys(woWhere).length > 0 ? woWhere : undefined,
      include: {
        assignee: { select: { id: true, fullName: true } },
        teamLeader: { select: { id: true, fullName: true } },
        planner: { select: { id: true, fullName: true } },
        materials: true,
        teamMembers: { include: { user: { select: { id: true, fullName: true } } } },
        timeLogs: true,
        workOrderDowntimes: true,
        repairCompletion: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch enriched asset data for all referenced assets
    const assetIds = [...new Set(workOrders.map(wo => wo.assetId).filter((id): id is string => !!id))];
    const assets = assetIds.length > 0 ? await db.asset.findMany({
      where: { id: { in: assetIds } },
      include: { category: { select: { name: true } } },
    }) : [];
    const assetMap = new Map(assets.map(a => [a.id, a]));

    // Fetch enriched inventory item data for all referenced materials
    const itemIds = [...new Set(workOrders.flatMap(wo =>
      (wo.materials || []).map(m => m.itemId).filter((id): id is string => !!id)
    ))];
    const inventoryItems = itemIds.length > 0 ? await db.inventoryItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, itemCode: true, name: true, unitOfMeasure: true, supplier: true, supplierPartNumber: true, binLocation: true, shelfLocation: true, specification: true, currentStock: true },
    }) : [];
    const itemMap = new Map(inventoryItems.map(i => [i.id, i]));

    // Helper: get enriched asset details from a work order
    function getAssetDetails(wo: { assetId?: string | null; assetName?: string | null }) {
      const asset = wo.assetId ? assetMap.get(wo.assetId) : null;
      return {
        assetId: wo.assetId || null,
        assetName: wo.assetName || asset?.name || 'Unassigned',
        assetTag: asset?.assetTag || null,
        manufacturer: asset?.manufacturer || null,
        model: asset?.model || null,
        serialNumber: asset?.serialNumber || null,
        category: asset?.category?.name || null,
        criticality: asset?.criticality || null,
        condition: asset?.condition || null,
        location: asset?.location || null,
        building: asset?.building || null,
        floor: asset?.floor || null,
        area: asset?.area || null,
        purchaseCost: asset?.purchaseCost || null,
        currentValue: asset?.currentValue || null,
      };
    }

    // Build itemName -> first itemId mapping for material enrichment
    const itemNameToItemId: Record<string, string> = {};
    for (const wo of workOrders) {
      for (const mat of (wo.materials || [])) {
        if (mat.itemId && mat.itemName && !itemNameToItemId[mat.itemName]) {
          itemNameToItemId[mat.itemName] = mat.itemId;
        }
      }
    }

    // Helper: get enriched inventory item details
    function getItemDetails(itemName: string) {
      const itemId = itemNameToItemId[itemName];
      const item = itemId ? itemMap.get(itemId) : null;
      return {
        itemCode: item?.itemCode || null,
        unitOfMeasure: item?.unitOfMeasure || null,
        supplier: item?.supplier || null,
        supplierPartNumber: item?.supplierPartNumber || null,
        binLocation: item?.binLocation || null,
        shelfLocation: item?.shelfLocation || null,
        specification: item?.specification || null,
        currentStock: item?.currentStock || null,
      };
    }

    const now = new Date();
    const openWOs = workOrders.filter(wo => !['completed', 'verified', 'closed', 'cancelled'].includes(wo.status));
    const completedWOs = workOrders.filter(wo => ['completed', 'verified', 'closed'].includes(wo.status));

    // ========== 1. BACKLOG ANALYTICS ==========
    // By age bracket
    const ageBrackets = [
      { label: '0-7 days', min: 0, max: 7 },
      { label: '8-14 days', min: 8, max: 14 },
      { label: '15-30 days', min: 15, max: 30 },
      { label: '31-60 days', min: 31, max: 60 },
      { label: '60+ days', min: 61, max: 99999 },
    ];
    const backlogByAge = ageBrackets.map(bracket => {
      const count = openWOs.filter(wo => {
        const daysSinceCreation = (now.getTime() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreation >= bracket.min && daysSinceCreation <= bracket.max;
      }).length;
      return { ageBracket: bracket.label, count };
    });

    // By priority
    const priorityMap: Record<string, number> = {};
    openWOs.forEach(wo => { priorityMap[wo.priority] = (priorityMap[wo.priority] || 0) + 1; });
    const backlogByPriority = Object.entries(priorityMap).map(([priority, count]) => ({ priority, count }));

    // By department
    const deptMap: Record<string, number> = {};
    openWOs.forEach(wo => {
      const dept = wo.departmentId || 'Unassigned';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const backlogByDepartment = Object.entries(deptMap).map(([departmentId, count]) => ({ departmentId, count }));

    // ========== 2. LABOR UTILIZATION ==========
    const techMap: Record<string, { userId: string; userName: string; plannedHours: number; actualHours: number; woCount: number; completedCount: number }> = {};
    workOrders.forEach(wo => {
      if (wo.assignee) {
        const uid = wo.assignee.id;
        if (!techMap[uid]) techMap[uid] = { userId: uid, userName: wo.assignee.fullName || 'Unknown', plannedHours: 0, actualHours: 0, woCount: 0, completedCount: 0 };
        techMap[uid].plannedHours += (wo.estimatedHours || 0);
        techMap[uid].actualHours += (wo.actualHours || 0);
        techMap[uid].woCount += 1;
        if (['completed', 'verified', 'closed'].includes(wo.status)) techMap[uid].completedCount += 1;
      }
    });
    const laborByTechnician = Object.values(techMap).map(t => ({
      ...t,
      utilizationPercent: t.plannedHours > 0 ? Math.round((t.actualHours / t.plannedHours) * 100) : 0,
    }));

    // Aggregate by department
    const deptLaborMap: Record<string, { plannedHours: number; actualHours: number; techCount: number }> = {};
    workOrders.forEach(wo => {
      const dept = wo.departmentId || 'Unassigned';
      if (!deptLaborMap[dept]) deptLaborMap[dept] = { plannedHours: 0, actualHours: 0, techCount: new Set<string>().size };
      deptLaborMap[dept].plannedHours += (wo.estimatedHours || 0);
      deptLaborMap[dept].actualHours += (wo.actualHours || 0);
    });
    // Count unique technicians per department
    const deptTechSet: Record<string, Set<string>> = {};
    workOrders.forEach(wo => {
      const dept = wo.departmentId || 'Unassigned';
      if (wo.assignedTo) {
        if (!deptTechSet[dept]) deptTechSet[dept] = new Set();
        deptTechSet[dept].add(wo.assignedTo);
      }
    });
    const laborByDepartment = Object.entries(deptLaborMap).map(([departmentId, data]) => ({
      departmentId,
      plannedHours: Math.round(data.plannedHours * 100) / 100,
      actualHours: Math.round(data.actualHours * 100) / 100,
      utilizationPercent: data.plannedHours > 0 ? Math.round((data.actualHours / data.plannedHours) * 100) : 0,
      technicianCount: deptTechSet[departmentId]?.size || 0,
    }));

    // ========== 3. DOWNTIME ANALYSIS ==========
    // Build WO lookup for downtime enrichment
    const woLookup = new Map(workOrders.map(wo => [wo.id, wo]));
    const allDowntimes = workOrders.flatMap(wo =>
      (wo.workOrderDowntimes || []).map(dt => ({ ...dt, assetName: wo.assetName, workOrderId: wo.id, assetId: wo.assetId }))
    );
    const totalDowntimeMinutes = allDowntimes.reduce((sum, dt) => sum + (dt.durationMinutes || 0), 0);
    const totalDowntimeHours = totalDowntimeMinutes / 60;

    // By asset
    const dtAssetMap: Record<string, { totalMinutes: number; count: number; assetId: string; assetName: string }> = {};
    allDowntimes.forEach(dt => {
      const key = dt.assetId || 'unassigned';
      const name = dt.assetName || 'Unknown';
      if (!dtAssetMap[key]) dtAssetMap[key] = { totalMinutes: 0, count: 0, assetId: dt.assetId || '', assetName: name };
      dtAssetMap[key].totalMinutes += (dt.durationMinutes || 0);
      dtAssetMap[key].count += 1;
    });
    const downtimeByAsset = Object.entries(dtAssetMap)
      .map(([, data]) => {
        const asset = data.assetId ? assetMap.get(data.assetId) : null;
        return {
          assetId: data.assetId || null,
          assetName: data.assetName,
          totalMinutes: data.totalMinutes,
          totalHours: Math.round(data.totalMinutes / 60 * 100) / 100,
          count: data.count,
          manufacturer: asset?.manufacturer || null,
          model: asset?.model || null,
          serialNumber: asset?.serialNumber || null,
          category: asset?.category?.name || null,
          criticality: asset?.criticality || null,
          condition: asset?.condition || null,
          location: asset?.location || null,
          building: asset?.building || null,
          area: asset?.area || null,
        };
      })
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 10);

    // By category (planned/unplanned)
    const dtCatMap: Record<string, { totalMinutes: number; count: number }> = {};
    allDowntimes.forEach(dt => {
      const cat = dt.category || 'unplanned';
      if (!dtCatMap[cat]) dtCatMap[cat] = { totalMinutes: 0, count: 0 };
      dtCatMap[cat].totalMinutes += (dt.durationMinutes || 0);
      dtCatMap[cat].count += 1;
    });
    const downtimeByCategory = Object.entries(dtCatMap).map(([category, data]) => ({
      category,
      totalMinutes: data.totalMinutes,
      totalHours: Math.round(data.totalMinutes / 60 * 100) / 100,
      count: data.count,
    }));

    // Trending over time (by week)
    const dtWeekMap: Record<string, number> = {};
    allDowntimes.forEach(dt => {
      const d = new Date(dt.downtimeStart);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      dtWeekMap[key] = (dtWeekMap[key] || 0) + (dt.durationMinutes || 0);
    });
    const downtimeTrend = Object.entries(dtWeekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, totalMinutes]) => ({ week, totalMinutes, totalHours: Math.round(totalMinutes / 60 * 100) / 100 }));

    // ========== 4. REPEAT FAILURE ANALYSIS ==========
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const failureRecords = await db.failureRecord.findMany({
      where: {
        ...plantFilter,
        detectedAt: { gte: ninetyDaysAgo },
      },
      include: {
        asset: { select: { id: true, name: true, assetCode: true, assetTag: true, manufacturer: true, model: true, serialNumber: true, criticality: true, condition: true, location: true, building: true, area: true, category: { select: { name: true } } } },
        component: { select: { id: true, name: true, componentCode: true } },
      },
    });

    const assetFailureMap: Record<string, { assetId: string; assetName: string; failures: any[] }> = {};
    failureRecords.forEach(fr => {
      const assetKey = fr.assetId || fr.workOrderId || 'unknown';
      const assetName = fr.asset?.name || fr.workOrderId || 'Unknown';
      if (!assetFailureMap[assetKey]) assetFailureMap[assetKey] = { assetId: assetKey, assetName, failures: [] };
      assetFailureMap[assetKey].failures.push(fr);
    });

    const repeatFailures = Object.values(assetFailureMap)
      .filter(a => a.failures.length >= 3)
      .map(a => {
        const firstAsset = a.failures[0]?.asset || null;
        return {
          assetId: a.assetId,
          assetName: a.assetName,
          manufacturer: firstAsset?.manufacturer || null,
          model: firstAsset?.model || null,
          serialNumber: firstAsset?.serialNumber || null,
          category: firstAsset?.category?.name || null,
          criticality: firstAsset?.criticality || null,
          location: firstAsset?.location || null,
          building: firstAsset?.building || null,
          area: firstAsset?.area || null,
          failureCount: a.failures.length,
          failureModes: [...new Set(a.failures.map(f => f.failureMode))],
          totalDowntimeMinutes: a.failures.reduce((s, f) => s + (f.downtimeMinutes || 0), 0),
          totalRepairCost: a.failures.reduce((s, f) => s + (f.repairCost || 0), 0),
          lastFailureDate: new Date(Math.max(...a.failures.map(f => new Date(f.detectedAt).getTime()))).toISOString(),
        };
      })
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 10);

    // ========== 5. TOOL UTILIZATION ==========
    const toolRequests = await db.repairToolRequest.findMany({
      where: Object.keys(plantFilter).length > 0 ? plantFilter : undefined,
    });
    const toolMap: Record<string, { toolName: string; requestCount: number; avgCheckoutHours: number; totalCheckouts: number; totalHours: number }> = {};
    toolRequests.forEach(tr => {
      const name = tr.toolName || 'Unknown';
      if (!toolMap[name]) toolMap[name] = { toolName: name, requestCount: 0, avgCheckoutHours: 0, totalCheckouts: 0, totalHours: 0 };
      toolMap[name].requestCount += 1;
      if (tr.issuedAt && tr.returnedAt) {
        const hours = (new Date(tr.returnedAt).getTime() - new Date(tr.issuedAt).getTime()) / (1000 * 60 * 60);
        toolMap[name].totalCheckouts += 1;
        toolMap[name].totalHours += hours;
      }
    });
    const toolUtilization = Object.values(toolMap)
      .map(t => ({
        ...t,
        avgCheckoutHours: t.totalCheckouts > 0 ? Math.round(t.totalHours / t.totalCheckouts * 100) / 100 : 0,
      }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 10);

    // ========== 6. MATERIAL CONSUMPTION ==========
    const matMap: Record<string, { itemName: string; totalQuantity: number; totalCost: number; woCount: Set<string> }> = {};
    workOrders.forEach(wo => {
      (wo.materials || []).forEach(mat => {
        if (!mat.itemName) return;
        const key = mat.itemName;
        if (!matMap[key]) matMap[key] = { itemName: key, totalQuantity: 0, totalCost: 0, woCount: new Set() };
        matMap[key].totalQuantity += (mat.quantity || 0);
        matMap[key].totalCost += (mat.totalCost || (mat.unitCost != null && mat.quantity ? mat.unitCost * mat.quantity : 0));
        matMap[key].woCount.add(wo.id);
      });
    });
    const materialConsumption = Object.values(matMap)
      .map(m => ({
        itemName: m.itemName,
        ...getItemDetails(m.itemName),
        totalQuantity: Math.round(m.totalQuantity * 100) / 100,
        totalCost: Math.round(m.totalCost * 100) / 100,
        woCount: m.woCount.size,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 20);

    // Cost by WO type
    const costByType: Record<string, number> = {};
    workOrders.forEach(wo => {
      costByType[wo.type] = (costByType[wo.type] || 0) + (wo.totalCost || 0);
    });
    const costByWOType = Object.entries(costByType).map(([type, totalCost]) => ({ type, totalCost: Math.round(totalCost * 100) / 100 }));

    // Cost trend (by month)
    const costMonthMap: Record<string, number> = {};
    workOrders.forEach(wo => {
      const d = new Date(wo.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      costMonthMap[key] = (costMonthMap[key] || 0) + (wo.totalCost || 0);
    });
    const costTrend = Object.entries(costMonthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, totalCost]) => ({ month, totalCost: Math.round(totalCost * 100) / 100 }));

    // ========== 7. PLANNER EFFICIENCY ==========
    const plannerMap: Record<string, { plannerId: string; plannerName: string; woCount: number; plannedHours: number; completedCount: number; avgPlanningTimeHours: number; planTimes: number[] }> = {};
    workOrders.forEach(wo => {
      if (!wo.plannerId) return;
      const pid = wo.plannerId;
      if (!plannerMap[pid]) plannerMap[pid] = { plannerId: pid, plannerName: wo.planner?.fullName || 'Unknown', woCount: 0, plannedHours: 0, completedCount: 0, avgPlanningTimeHours: 0, planTimes: [] };
      plannerMap[pid].woCount += 1;
      plannerMap[pid].plannedHours += (wo.estimatedHours || 0);
      if (['completed', 'verified', 'closed'].includes(wo.status)) plannerMap[pid].completedCount += 1;
      if (wo.createdAt && wo.plannedStart) {
        const planningHours = (new Date(wo.plannedStart).getTime() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60);
        if (planningHours >= 0 && planningHours < 720) plannerMap[pid].planTimes.push(planningHours);
      }
    });
    const plannerEfficiency = Object.values(plannerMap).map(p => ({
      plannerId: p.plannerId,
      plannerName: p.plannerName,
      workOrdersCreated: p.woCount,
      avgPlanningTimeHours: p.planTimes.length > 0 ? Math.round(p.planTimes.reduce((a, b) => a + b, 0) / p.planTimes.length * 100) / 100 : 0,
      onTimeCompletionRate: p.woCount > 0 ? Math.round((p.completedCount / p.woCount) * 100) : 0,
    }));

    // ========== 8. TECHNICIAN PRODUCTIVITY ==========
    const technicianProductivity = Object.values(techMap).map(t => ({
      ...t,
      avgCompletionTimeHours: t.completedCount > 0 ? Math.round((t.actualHours / t.completedCount) * 100) / 100 : 0,
      firstTimeFixRate: t.woCount > 0 ? Math.round((t.completedCount / t.woCount) * 100) : 0,
    })).sort((a, b) => b.completedCount - a.completedCount);

    // ========== 9. SLA COMPLIANCE ==========
    const slaByPriority: Record<string, { withinSLA: number; breached: number }> = {};
    workOrders.forEach(wo => {
      if (!['completed', 'verified', 'closed'].includes(wo.status)) return;
      if (!wo.plannedEnd || !wo.actualEnd) return;
      const withinSLA = new Date(wo.actualEnd) <= new Date(wo.plannedEnd);
      if (!slaByPriority[wo.priority]) slaByPriority[wo.priority] = { withinSLA: 0, breached: 0 };
      if (withinSLA) slaByPriority[wo.priority].withinSLA += 1;
      else slaByPriority[wo.priority].breached += 1;
    });
    const slaComplianceByPriority = Object.entries(slaByPriority).map(([priority, data]) => ({
      priority,
      withinSLA: data.withinSLA,
      breached: data.breached,
      total: data.withinSLA + data.breached,
      compliancePercent: (data.withinSLA + data.breached) > 0 ? Math.round((data.withinSLA / (data.withinSLA + data.breached)) * 100) : 100,
    }));

    // ========== 10. COST ANALYTICS ==========
    const totalMaintenanceCost = Math.round(workOrders.reduce((s, wo) => s + (wo.totalCost || 0), 0) * 100) / 100;
    const totalLaborCost = Math.round(workOrders.reduce((s, wo) => s + (wo.laborCost || 0), 0) * 100) / 100;
    const totalPartsCost = Math.round(workOrders.reduce((s, wo) => s + (wo.partsCost || 0), 0) * 100) / 100;
    const totalContractorCost = Math.round(workOrders.reduce((s, wo) => s + (wo.contractorCost || 0), 0) * 100) / 100;
    const avgCostPerWO = workOrders.length > 0 ? Math.round(totalMaintenanceCost / workOrders.length * 100) / 100 : 0;

    // Cost by asset
    const costByAssetMap: Record<string, { assetId: string; assetName: string; totalCost: number; laborCost: number; partsCost: number; woCount: number }> = {};
    workOrders.forEach(wo => {
      const key = wo.assetId || 'unassigned';
      const name = wo.assetName || 'Unassigned';
      if (!costByAssetMap[key]) costByAssetMap[key] = { assetId: wo.assetId || '', assetName: name, totalCost: 0, laborCost: 0, partsCost: 0, woCount: 0 };
      costByAssetMap[key].totalCost += wo.totalCost || 0;
      costByAssetMap[key].laborCost += wo.laborCost || 0;
      costByAssetMap[key].partsCost += wo.partsCost || 0;
      costByAssetMap[key].woCount++;
    });
    const costByAsset = Object.values(costByAssetMap)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10)
      .map(a => {
        const asset = a.assetId ? assetMap.get(a.assetId) : null;
        return {
          ...a,
          assetTag: asset?.assetTag || null,
          manufacturer: asset?.manufacturer || null,
          model: asset?.model || null,
          serialNumber: asset?.serialNumber || null,
          category: asset?.category?.name || null,
          criticality: asset?.criticality || null,
          condition: asset?.condition || null,
          location: asset?.location || null,
          building: asset?.building || null,
          area: asset?.area || null,
          totalCost: Math.round(a.totalCost * 100) / 100,
          laborCost: Math.round(a.laborCost * 100) / 100,
          partsCost: Math.round(a.partsCost * 100) / 100,
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        reportDate: now.toISOString(),
        dateRange: { from: from || null, to: to || null },
        summary: {
          totalWorkOrders: workOrders.length,
          openWorkOrders: openWOs.length,
          completedWorkOrders: completedWOs.length,
          completionRate: workOrders.length > 0 ? Math.round((completedWOs.length / workOrders.length) * 100) : 0,
          totalMaintenanceCost,
          totalLaborCost,
          totalPartsCost,
          totalContractorCost,
          avgCostPerWO,
        },
        backlogAnalytics: {
          totalOpen: openWOs.length,
          byAgeBracket: backlogByAge,
          byPriority: backlogByPriority,
          byDepartment: backlogByDepartment,
        },
        laborUtilization: {
          byTechnician: laborByTechnician,
          byDepartment: laborByDepartment,
        },
        downtimeAnalysis: {
          totalHours: Math.round(totalDowntimeHours * 100) / 100,
          totalMinutes: Math.round(totalDowntimeMinutes),
          eventCount: allDowntimes.length,
          byAsset: downtimeByAsset,
          byCategory: downtimeByCategory,
          trend: downtimeTrend,
        },
        repeatFailures,
        toolUtilization,
        materialConsumption,
        costAnalytics: {
          total: totalMaintenanceCost,
          labor: totalLaborCost,
          parts: totalPartsCost,
          contractor: totalContractorCost,
          byWOType: costByWOType,
          byAsset: costByAsset,
          trend: costTrend,
        },
        plannerEfficiency,
        technicianProductivity,
        slaComplianceByPriority,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate enterprise report';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
