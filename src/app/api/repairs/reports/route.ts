import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

type ReportType = 'lifecycle' | 'execution' | 'materials' | 'tools' | 'downtime' | 'technician_performance';

// GET /api/repairs/reports?type=lifecycle&plantId=&from=&to=&priority=&department=
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ReportType | null;

    if (!type || !['lifecycle', 'execution', 'materials', 'tools', 'downtime', 'technician_performance'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid report type. Must be one of: lifecycle, execution, materials, tools, downtime, technician_performance' },
        { status: 400 },
      );
    }

    const plantId = searchParams.get('plantId') || undefined;
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;
    const priority = searchParams.get('priority') || undefined;
    const department = searchParams.get('department') || undefined;
    const assignee = searchParams.get('assignee') || undefined;

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = from;
    if (to) dateFilter.lte = to;

    switch (type) {
      case 'lifecycle': return handleLifecycleReport(plantId, from, to, priority, department, dateFilter);
      case 'execution': return handleExecutionReport(plantId, from, to, priority, assignee, dateFilter);
      case 'technician_performance': return handleTechnicianPerformanceReport(plantId, from, to, department, dateFilter);
      case 'materials': return handleMaterialsReport(plantId, from, to, dateFilter);
      case 'downtime': return handleDowntimeReport(plantId, from, to, dateFilter);
      case 'tools': return handleToolsReport(plantId, from, to, dateFilter);
      default:
        return NextResponse.json({ success: false, error: 'Unknown report type' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── LIFECYCLE REPORT ──────────────────────────────────────────────────────────
// Full lifecycle from MR → WO closure including time at each stage
async function handleLifecycleReport(
  plantId: string | undefined,
  from: Date | undefined,
  to: Date | undefined,
  priority: string | undefined,
  _department: string | undefined,
  dateFilter: Record<string, unknown>,
) {
  const mrWhere: Record<string, unknown> = { plantId: plantId || undefined };
  if (priority) mrWhere.priority = priority;
  if (Object.keys(dateFilter).length > 0) mrWhere.createdAt = dateFilter;

  const mrs = await db.maintenanceRequest.findMany({
    where: mrWhere,
    include: {
      workOrder: {
        include: {
          statusHistory: { orderBy: { createdAt: 'asc' } },
          timeLogs: true,
        },
      },
      requester: { select: { id: true, fullName: true } },
      supervisor: { select: { id: true, fullName: true } },
      approver: { select: { id: true, fullName: true } },
      assignedPlanner: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const lifecycleEntries = mrs.map((mr) => {
    const stages: Record<string, { timestamp: Date | null; durationHours: number | null }> = {};
    let previousTimestamp: Date | null = mr.createdAt;

    stages.mr_created = { timestamp: mr.createdAt, durationHours: null };

    // Check for supervisor review
    if (mr.workflowStatus === 'supervisor_review' || mr.supervisorId) {
      const nextStage: Date | null = mr.updatedAt;
      stages.mr_supervisor_review = { timestamp: nextStage, durationHours: previousTimestamp && nextStage ? (nextStage.getTime() - previousTimestamp.getTime()) / (1000 * 3600) : null };
      previousTimestamp = nextStage;
    }

    // Check for approval
    if (mr.status === 'approved' || mr.status === 'converted') {
      const approvalTime = mr.updatedAt;
      stages.mr_approved = { timestamp: approvalTime, durationHours: previousTimestamp && approvalTime ? (approvalTime.getTime() - previousTimestamp.getTime()) / (1000 * 3600) : null };
      previousTimestamp = approvalTime;
    }

    // Check for planner assignment
    if (mr.assignedPlannerId) {
      stages.mr_planner_assigned = { timestamp: mr.updatedAt, durationHours: previousTimestamp ? (mr.updatedAt.getTime() - previousTimestamp.getTime()) / (1000 * 3600) : null };
      previousTimestamp = mr.updatedAt;
    }

    // WO lifecycle stages
    const wo = mr.workOrder;
    if (wo) {
      stages.wo_created = { timestamp: wo.createdAt, durationHours: previousTimestamp ? (wo.createdAt.getTime() - previousTimestamp.getTime()) / (1000 * 3600) : null };
      previousTimestamp = wo.createdAt;

      for (const sh of wo.statusHistory) {
        const duration = previousTimestamp ? (sh.createdAt.getTime() - previousTimestamp.getTime()) / (1000 * 3600) : null;
        stages[`wo_${sh.toStatus}`] = { timestamp: sh.createdAt, durationHours: duration };
        previousTimestamp = sh.createdAt;
      }
    }

    const totalTurnaround = mr.createdAt && wo?.actualEnd
      ? (wo.actualEnd.getTime() - mr.createdAt.getTime()) / (1000 * 3600)
      : null;

    return {
      mrId: mr.id,
      mrNumber: mr.requestNumber,
      mrTitle: mr.title,
      priority: mr.priority,
      status: mr.status,
      workflowStatus: mr.workflowStatus,
      hasWorkOrder: !!wo,
      woNumber: wo?.woNumber || null,
      woStatus: wo?.status || null,
      stages,
      totalTurnaroundHours: totalTurnaround,
      requester: mr.requester,
      supervisor: mr.supervisor,
      approver: mr.approver,
      planner: mr.assignedPlanner,
    };
  });

  // Calculate averages
  const completedWithWo = lifecycleEntries.filter((e) => e.woStatus === 'closed' && e.totalTurnaroundHours !== null);
  const avgTurnaround = completedWithWo.length > 0
    ? completedWithWo.reduce((sum, e) => sum + (e.totalTurnaroundHours || 0), 0) / completedWithWo.length
    : null;

  const avgByStage: Record<string, number> = {};
  for (const entry of lifecycleEntries) {
    for (const [stageName, stageData] of Object.entries(entry.stages)) {
      if (stageData.durationHours !== null) {
        if (!avgByStage[stageName]) avgByStage[stageName] = [];
        (avgByStage[stageName] as unknown as number[]).push(stageData.durationHours);
      }
    }
  }
  const avgStageDurations: Record<string, number> = {};
  for (const [k, v] of Object.entries(avgByStage)) {
    const arr = v as unknown as number[];
    avgStageDurations[k] = arr.length > 0 ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;
  }

  return NextResponse.json({
    success: true,
    data: {
      totalRequests: mrs.length,
      convertedToWo: mrs.filter((m) => m.workOrder).length,
      closed: completedWithWo.length,
      avgTurnaroundHours: Math.round((avgTurnaround || 0) * 100) / 100,
      avgStageDurations,
      entries: lifecycleEntries,
    },
  });
}

// ── EXECUTION REPORT ─────────────────────────────────────────────────────────
// WO completion rates, actual vs estimated, rework, team performance
async function handleExecutionReport(
  plantId: string | undefined,
  from: Date | undefined,
  to: Date | undefined,
  priority: string | undefined,
  assignee: string | undefined,
  dateFilter: Record<string, unknown>,
) {
  const woWhere: Record<string, unknown> = { plantId: plantId || undefined };
  if (priority) woWhere.priority = priority;
  if (assignee) woWhere.assignedTo = assignee;
  if (Object.keys(dateFilter).length > 0) woWhere.createdAt = dateFilter;

  const workOrders = await db.workOrder.findMany({
    where: woWhere,
    include: {
      assignee: { select: { id: true, fullName: true, department: true } },
      teamLeader: { select: { id: true, fullName: true } },
      repairCompletion: true,
      timeLogs: true,
      materials: true,
      statusHistory: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  const total = workOrders.length;
  const closed = workOrders.filter((wo) => wo.status === 'closed');
  const completed = workOrders.filter((wo) => ['completed', 'verified', 'closed'].includes(wo.status));

  // Completion by type
  const byType: Record<string, { total: number; closed: number; rate: number }> = {};
  for (const wo of workOrders) {
    if (!byType[wo.type]) byType[wo.type] = { total: 0, closed: 0, rate: 0 };
    byType[wo.type].total++;
    if (wo.status === 'closed') byType[wo.type].closed++;
  }
  for (const t of Object.keys(byType)) {
    byType[t].rate = byType[t].total > 0 ? byType[t].closed / byType[t].total : 0;
  }

  // Completion by priority
  const byPriority: Record<string, { total: number; closed: number; rate: number }> = {};
  for (const wo of workOrders) {
    if (!byPriority[wo.priority]) byPriority[wo.priority] = { total: 0, closed: 0, rate: 0 };
    byPriority[wo.priority].total++;
    if (wo.status === 'closed') byPriority[wo.priority].closed++;
  }
  for (const p of Object.keys(byPriority)) {
    byPriority[p].rate = byPriority[p].total > 0 ? byPriority[p].closed / byPriority[p].total : 0;
  }

  // Actual vs estimated hours
  let totalEstimated = 0;
  let totalActual = 0;
  let withEstimate = 0;
  for (const wo of workOrders) {
    if (wo.estimatedHours) {
      totalEstimated += wo.estimatedHours;
      withEstimate++;
    }
    if (wo.actualHours) totalActual += wo.actualHours;
  }
  const avgEstimated = withEstimate > 0 ? totalEstimated / withEstimate : 0;
  const avgActual = completed.length > 0 ? totalActual / completed.length : 0;
  const avgVariance = withEstimate > 0 ? avgActual - avgEstimated : 0;

  // Rework analysis
  const reworkCount = workOrders.filter((wo) => {
    const completion = wo.repairCompletion;
    return completion && completion.reworkCount > 0;
  }).length;
  const reworkRate = total > 0 ? reworkCount / total : 0;
  const totalReworkInstances = workOrders.reduce((sum, wo) => sum + (wo.repairCompletion?.reworkCount || 0), 0);

  // Team performance metrics
  const teamMetrics: Record<string, { fullName: string; total: number; closed: number; avgActualHours: number; rework: number }> = {};
  for (const wo of workOrders) {
    const techName = wo.assignee?.fullName || 'Unassigned';
    if (!teamMetrics[wo.assignedTo || 'unassigned']) {
      teamMetrics[wo.assignedTo || 'unassigned'] = { fullName: techName, total: 0, closed: 0, avgActualHours: 0, rework: 0 };
    }
    teamMetrics[wo.assignedTo || 'unassigned'].total++;
    if (wo.status === 'closed') teamMetrics[wo.assignedTo || 'unassigned'].closed++;
    teamMetrics[wo.assignedTo || 'unassigned'].rework += (wo.repairCompletion?.reworkCount || 0);
  }
  for (const tm of Object.values(teamMetrics)) {
    tm.avgActualHours = tm.closed > 0 ? workOrders.filter((wo) => wo.assignedTo && wo.status === 'closed').reduce((sum) => sum + (workOrders.find((w) => w.assignedTo)?.actualHours || 0), 0) / tm.closed : 0;
  }

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        total,
        completed: completed.length,
        closed: closed.length,
        completionRate: total > 0 ? completed.length / total : 0,
        closureRate: total > 0 ? closed.length / total : 0,
      },
      byType,
      byPriority,
      labor: {
        avgEstimatedHours: Math.round(avgEstimated * 100) / 100,
        avgActualHours: Math.round(avgActual * 100) / 100,
        avgVarianceHours: Math.round(avgVariance * 100) / 100,
        variancePercent: avgEstimated > 0 ? Math.round((avgVariance / avgEstimated) * 10000) / 100 : 0,
      },
      rework: {
        reworkWos: reworkCount,
        reworkRate: Math.round(reworkRate * 10000) / 100,
        totalReworkInstances,
      },
      teamMetrics: Object.values(teamMetrics).sort((a, b) => b.closed - a.closed),
    },
  });
}

// ── TECHNICIAN PERFORMANCE REPORT ────────────────────────────────────────────
async function handleTechnicianPerformanceReport(
  plantId: string | undefined,
  from: Date | undefined,
  to: Date | undefined,
  department: string | undefined,
  dateFilter: Record<string, unknown>,
) {
  // Get all work orders in date range
  const woWhere: Record<string, unknown> = { plantId: plantId || undefined };
  if (department) woWhere.departmentId = department;
  if (Object.keys(dateFilter).length > 0) woWhere.createdAt = dateFilter;

  const workOrders = await db.workOrder.findMany({
    where: woWhere,
    include: {
      assignee: { select: { id: true, fullName: true, username: true, department: true, primaryTrade: true } },
      repairCompletion: true,
      timeLogs: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  // Group by technician
  const techMap: Record<string, {
    user: { id: string; fullName: string; username: string; department: string | null; primaryTrade: string | null };
    woCount: number;
    closedCount: number;
    totalTimeLogged: number;
    totalEstimated: number;
    reworkCount: number;
    avgTimePerWo: number;
    timeAccuracy: number;
  }> = {};

  for (const wo of workOrders) {
    const uid = wo.assignedTo;
    if (!uid) continue;

    if (!techMap[uid]) {
      techMap[uid] = {
        user: wo.assignee!,
        woCount: 0,
        closedCount: 0,
        totalTimeLogged: 0,
        totalEstimated: 0,
        reworkCount: 0,
        avgTimePerWo: 0,
        timeAccuracy: 0,
      };
    }

    techMap[uid].woCount++;
    if (wo.status === 'closed') techMap[uid].closedCount++;
    techMap[uid].totalTimeLogged += wo.actualHours || 0;
    techMap[uid].totalEstimated += wo.estimatedHours || 0;
    techMap[uid].reworkCount += wo.repairCompletion?.reworkCount || 0;
  }

  // Calculate per-technician metrics
  const technicians = Object.values(techMap).map((tech) => {
    const avgTimePerWo = tech.woCount > 0 ? tech.totalTimeLogged / tech.woCount : 0;
    const timeAccuracy = tech.totalEstimated > 0
      ? 100 - Math.abs(tech.totalTimeLogged - tech.totalEstimated) / tech.totalEstimated * 100
      : 0;

    return {
      ...tech,
      avgTimePerWo: Math.round(avgTimePerWo * 100) / 100,
      timeAccuracy: Math.max(0, Math.round(timeAccuracy * 100) / 100),
      reworkRate: tech.woCount > 0 ? Math.round((tech.reworkCount / tech.woCount) * 10000) / 100 : 0,
      completionRate: tech.woCount > 0 ? Math.round((tech.closedCount / tech.woCount) * 10000) / 100 : 0,
    };
  }).sort((a, b) => b.closedCount - a.closedCount);

  return NextResponse.json({
    success: true,
    data: {
      totalTechnicians: technicians.length,
      totalWorkOrders: workOrders.length,
      technicians,
    },
  });
}

// ── MATERIALS REPORT ─────────────────────────────────────────────────────────
async function handleMaterialsReport(
  plantId: string | undefined,
  from: Date | undefined,
  to: Date | undefined,
  dateFilter: Record<string, unknown>,
) {
  const woWhere: Record<string, unknown> = { plantId: plantId || undefined };
  if (Object.keys(dateFilter).length > 0) woWhere.createdAt = dateFilter;

  const workOrders = await db.workOrder.findMany({
    where: woWhere,
    include: {
      materials: true,
      repairCompletion: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  // Material cost by WO
  const materialCostByWo = workOrders.map((wo) => {
    const totalMaterialCost = wo.materials.reduce((sum, m) => sum + (m.totalCost || 0), 0);
    const totalIssued = wo.materials.filter((m) => ['issued', 'returned'].includes(m.status)).length;
    const totalReturned = wo.materials.filter((m) => m.status === 'returned').length;

    return {
      workOrderId: wo.id,
      woNumber: wo.woNumber,
      title: wo.title,
      materialCount: wo.materials.length,
      issuedCount: totalIssued,
      returnedCount: totalReturned,
      totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
      completionCost: wo.repairCompletion?.totalMaterialCost || 0,
    };
  }).filter((m) => m.materialCount > 0);

  // Aggregate cost by category (via items)
  const totalMaterialCost = materialCostByWo.reduce((sum, m) => sum + m.totalMaterialCost, 0);

  // Spare part return analysis
  const sprWhere: Record<string, unknown> = { plantId: plantId || undefined };
  if (Object.keys(dateFilter).length > 0) sprWhere.createdAt = dateFilter;

  const sparePartReturns = await db.sparePartReturn.findMany({ where: sprWhere });
  const totalReturns = sparePartReturns.length;
  const returnedToStore = sparePartReturns.filter((r) => r.status === 'returned_to_store').length;
  const disposed = sparePartReturns.filter((r) => r.status === 'disposed').length;
  const totalRefurbCost = sparePartReturns.reduce((sum, r) => sum + (r.actualRefurbCost || 0), 0);
  const returnRate = totalReturns > 0 ? Math.round((returnedToStore / totalReturns) * 10000) / 100 : 0;

  // Top materials by cost
  const itemIds = [...new Set(workOrders.flatMap((wo) => wo.materials.map((m) => m.itemId).filter(Boolean) as string[]))];
  const topItems = itemIds.length > 0 ? await db.inventoryItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, itemCode: true, name: true, category: true, unitCost: true },
    take: 20,
  }) : [];

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
        workOrdersWithMaterials: materialCostByWo.length,
        avgCostPerWo: materialCostByWo.length > 0 ? Math.round(totalMaterialCost / materialCostByWo.length * 100) / 100 : 0,
      },
      costByWorkOrder: materialCostByWo.sort((a, b) => b.totalMaterialCost - a.totalMaterialCost).slice(0, 20),
      sparePartReturns: {
        total: totalReturns,
        returnedToStore,
        disposed,
        returnRate,
        totalRefurbCost: Math.round(totalRefurbCost * 100) / 100,
      },
      topItems,
    },
  });
}

// ── DOWNTIME REPORT ──────────────────────────────────────────────────────────
async function handleDowntimeReport(
  plantId: string | undefined,
  from: Date | undefined,
  to: Date | undefined,
  dateFilter: Record<string, unknown>,
) {
  const dtWhere: Record<string, unknown> = { plantId: plantId || undefined };
  if (Object.keys(dateFilter).length > 0) dtWhere.createdAt = dateFilter;

  const downtimes = await db.workOrderDowntime.findMany({
    where: dtWhere,
    include: {
      workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const total = downtimes.length;
  const totalDowntimeMinutes = downtimes.reduce((sum, d) => sum + (d.durationMinutes || 0), 0);
  const totalDowntimeHours = Math.round((totalDowntimeMinutes / 60) * 100) / 100;
  const avgDurationHours = total > 0 ? Math.round((totalDowntimeMinutes / 60 / total) * 100) / 100 : 0;
  const totalProductionLoss = downtimes.reduce((sum, d) => sum + (d.productionLoss || 0), 0);

  // By asset
  const byAsset: Record<string, { assetName: string; count: number; totalHours: number; totalLoss: number }> = {};
  for (const dt of downtimes) {
    const key = dt.assetId || 'unknown';
    if (!byAsset[key]) byAsset[key] = { assetName: dt.assetName, count: 0, totalHours: 0, totalLoss: 0 };
    byAsset[key].count++;
    byAsset[key].totalHours += (dt.durationMinutes || 0) / 60;
    byAsset[key].totalLoss += dt.productionLoss || 0;
  }

  // By category
  const byCategory: Record<string, { count: number; totalHours: number }> = {};
  for (const dt of downtimes) {
    if (!byCategory[dt.category]) byCategory[dt.category] = { count: 0, totalHours: 0 };
    byCategory[dt.category].count++;
    byCategory[dt.category].totalHours += (dt.durationMinutes || 0) / 60;
  }

  // By impact level
  const byImpactLevel: Record<string, { count: number; totalHours: number }> = {};
  for (const dt of downtimes) {
    if (!byImpactLevel[dt.impactLevel]) byImpactLevel[dt.impactLevel] = { count: 0, totalHours: 0 };
    byImpactLevel[dt.impactLevel].count++;
    byImpactLevel[dt.impactLevel].totalHours += (dt.durationMinutes || 0) / 60;
  }

  const topAssetsByDowntime = Object.entries(byAsset)
    .map(([assetId, data]) => ({ assetId, ...data, totalHours: Math.round(data.totalHours * 100) / 100 }))
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 10);

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        totalEvents: total,
        totalDowntimeHours,
        avgDurationHours,
        totalProductionLoss: Math.round(totalProductionLoss * 100) / 100,
        avgLossPerHour: totalDowntimeHours > 0 ? Math.round((totalProductionLoss / totalDowntimeHours) * 100) / 100 : 0,
      },
      byAsset: topAssetsByDowntime,
      byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, { ...v, totalHours: Math.round(v.totalHours * 100) / 100 }])),
      byImpactLevel: Object.fromEntries(Object.entries(byImpactLevel).map(([k, v]) => [k, { ...v, totalHours: Math.round(v.totalHours * 100) / 100 }])),
    },
  });
}

// ── TOOLS REPORT ─────────────────────────────────────────────────────────────
async function handleToolsReport(
  plantId: string | undefined,
  from: Date | undefined,
  to: Date | undefined,
  dateFilter: Record<string, unknown>,
) {
  // Tool damage analysis
  const dtrWhere: Record<string, unknown> = { plantId: plantId || undefined };
  if (Object.keys(dateFilter).length > 0) dtrWhere.createdAt = dateFilter;

  const damagedReports = await db.damagedToolReport.findMany({
    where: dtrWhere,
    include: {
      tool: { select: { id: true, toolCode: true, name: true, category: true, purchaseCost: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  const totalDamageReports = damagedReports.length;
  const totalRepairCost = damagedReports.reduce((sum, d) => sum + (d.actualRepairCost || 0), 0);
  const writtenOff = damagedReports.filter((d) => d.status === 'written_off').length;
  const repaired = damagedReports.filter((d) => d.status === 'repaired').length;
  const inProgress = damagedReports.filter((d) => d.status === 'repair_in_progress').length;

  // By damage type
  const byDamageType: Record<string, { count: number; cost: number }> = {};
  for (const dr of damagedReports) {
    if (!byDamageType[dr.damageType]) byDamageType[dr.damageType] = { count: 0, cost: 0 };
    byDamageType[dr.damageType].count++;
    byDamageType[dr.damageType].cost += dr.actualRepairCost || 0;
  }

  // By severity
  const bySeverity: Record<string, { count: number; cost: number }> = {};
  for (const dr of damagedReports) {
    if (!bySeverity[dr.damageSeverity]) bySeverity[dr.damageSeverity] = { count: 0, cost: 0 };
    bySeverity[dr.damageSeverity].count++;
    bySeverity[dr.damageSeverity].cost += dr.actualRepairCost || 0;
  }

  // By tool category
  const byCategory: Record<string, { count: number; cost: number }> = {};
  for (const dr of damagedReports) {
    const cat = dr.tool?.category || 'Unknown';
    if (!byCategory[cat]) byCategory[cat] = { count: 0, cost: 0 };
    byCategory[cat].count++;
    byCategory[cat].cost += dr.actualRepairCost || 0;
  }

  // Tool transfer frequency
  const txWhere: Record<string, unknown> = {};
  if (from || to) txWhere.createdAt = dateFilter;

  const transfers = await db.toolTransferRequest.findMany({
    where: { ...txWhere, plantId: plantId || undefined },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const totalTransfers = transfers.length;
  const completedTransfers = transfers.filter((t) => t.status === 'transferred').length;

  // Most damaged tools
  const damagedToolsMap: Record<string, { toolName: string; toolCode: string; category: string; damageCount: number; totalCost: number }> = {};
  for (const dr of damagedReports) {
    if (!dr.tool) continue;
    const key = dr.toolId;
    if (!damagedToolsMap[key]) {
      damagedToolsMap[key] = { toolName: dr.tool.name, toolCode: dr.tool.toolCode, category: dr.tool.category, damageCount: 0, totalCost: 0 };
    }
    damagedToolsMap[key].damageCount++;
    damagedToolsMap[key].totalCost += dr.actualRepairCost || 0;
  }

  const mostDamagedTools = Object.values(damagedToolsMap)
    .sort((a, b) => b.damageCount - a.damageCount)
    .slice(0, 10);

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        totalDamageReports,
        totalRepairCost: Math.round(totalRepairCost * 100) / 100,
        repaired,
        writtenOff,
        inProgress,
        avgRepairCost: totalDamageReports > 0 ? Math.round((totalRepairCost / totalDamageReports) * 100) / 100 : 0,
        totalTransfers,
        completedTransfers,
      },
      byDamageType: Object.fromEntries(Object.entries(byDamageType).map(([k, v]) => [k, { ...v, cost: Math.round(v.cost * 100) / 100 }])),
      bySeverity: Object.fromEntries(Object.entries(bySeverity).map(([k, v]) => [k, { ...v, cost: Math.round(v.cost * 100) / 100 }])),
      byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, { ...v, cost: Math.round(v.cost * 100) / 100 }])),
      mostDamagedTools,
    },
  });
}
