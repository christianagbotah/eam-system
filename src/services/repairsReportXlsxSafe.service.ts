import { db } from '@/lib/db';
import type { SessionData } from '@/lib/auth';
import {
  createStandardWorkbook,
  addDataSheet,
  addAnalyticsSheet,
  generateXlsxBuffer,
  buildFilename,
  type ReportColumn,
  type AnalyticsRow,
} from './reportExportXlsx.service';
import {
  generateReport as generateLegacyReport,
  type ReportFilters,
  type ReportResult,
  type ReportType,
} from './repairsReportXlsx.service';

function flattenFilters(filters: ReportFilters): Record<string, string | undefined> {
  return { ...filters };
}

function buildBaseWhere(filters: ReportFilters): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (filters.plantId) where.plantId = filters.plantId;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.type) where.type = filters.type;
  if (filters.tradeActivity) where.tradeActivity = filters.tradeActivity;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.assetId) where.assetId = filters.assetId;
  if (filters.assigneeId) where.assignedTo = filters.assigneeId;

  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (filters.dateFrom) createdAt.gte = new Date(`${filters.dateFrom}T00:00:00`);
    if (filters.dateTo) createdAt.lte = new Date(`${filters.dateTo}T23:59:59`);
    where.createdAt = createdAt;
  }
  return where;
}

function buildMrWhere(filters: ReportFilters): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (filters.plantId) where.plantId = filters.plantId;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.assetId) where.assetId = filters.assetId;

  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (filters.dateFrom) createdAt.gte = new Date(`${filters.dateFrom}T00:00:00`);
    if (filters.dateTo) createdAt.lte = new Date(`${filters.dateTo}T23:59:59`);
    where.createdAt = createdAt;
  }
  return where;
}

function buildBreakdown(
  items: Array<Record<string, unknown>>,
  field: string,
): AnalyticsRow[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = String(item[field] ?? 'Unknown');
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const total = items.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({
      [field]: value,
      Count: count,
      Percentage: `${((count / total) * 100).toFixed(1)}%`,
    }));
}

const WORK_ORDER_COLUMNS: ReportColumn[] = [
  { key: 'woNumber', header: 'WO Number', width: 22 },
  { key: 'title', header: 'Title', width: 30 },
  { key: 'type', header: 'Type', width: 14 },
  { key: 'priority', header: 'Priority', width: 12 },
  { key: 'status', header: 'Status', width: 18 },
  { key: 'assetName', header: 'Asset', width: 25 },
  { key: 'assigneeName', header: 'Assigned To', width: 22 },
  { key: 'teamLeaderName', header: 'Team Leader', width: 22 },
  { key: 'tradeActivity', header: 'Trade', width: 16 },
  { key: 'failureDescription', header: 'Failure Description', width: 35 },
  { key: 'estimatedHours', header: 'Est. Hours', format: 'number', width: 14 },
  { key: 'actualHours', header: 'Actual Hours', format: 'number', width: 14 },
  { key: 'plannedStart', header: 'Planned Start', format: 'datetime', width: 20 },
  { key: 'plannedEnd', header: 'Planned End', format: 'datetime', width: 20 },
  { key: 'actualStart', header: 'Actual Start', format: 'datetime', width: 20 },
  { key: 'actualEnd', header: 'Actual End', format: 'datetime', width: 20 },
  { key: 'totalCost', header: 'Total Cost', format: 'currency', width: 14 },
  { key: 'laborCost', header: 'Labor Cost', format: 'currency', width: 14 },
  { key: 'partsCost', header: 'Parts Cost', format: 'currency', width: 14 },
  { key: 'createdAt', header: 'Created', format: 'datetime', width: 20 },
];

async function exportWorkOrderReport(
  filters: ReportFilters,
  session: SessionData,
): Promise<ReportResult> {
  const where = buildBaseWhere(filters);
  const workOrders = await db.workOrder.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      assignee: { select: { id: true, fullName: true } },
      teamLeader: { select: { id: true, fullName: true } },
      repairCompletion: {
        select: {
          totalLaborHours: true,
          totalMaterialCost: true,
          totalDowntimeMinutes: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = workOrders.map((wo) => ({
    woNumber: wo.woNumber,
    title: wo.title,
    type: wo.type,
    priority: wo.priority,
    status: wo.status,
    // WorkOrder stores assetName/assetId as scalar fields in the active schema.
    assetName: wo.assetName || '',
    assigneeName: wo.assignee?.fullName || '',
    teamLeaderName: wo.teamLeader?.fullName || '',
    tradeActivity: wo.tradeActivity || '',
    failureDescription: wo.failureDescription || '',
    estimatedHours: wo.estimatedHours ?? 0,
    actualHours: wo.repairCompletion?.totalLaborHours ?? wo.actualHours ?? 0,
    plannedStart: wo.plannedStart?.toISOString() ?? '',
    plannedEnd: wo.plannedEnd?.toISOString() ?? '',
    actualStart: wo.actualStart?.toISOString() ?? '',
    actualEnd: wo.actualEnd?.toISOString() ?? '',
    totalCost: wo.totalCost ?? 0,
    laborCost: wo.laborCost ?? 0,
    partsCost: wo.partsCost ?? 0,
    createdAt: wo.createdAt.toISOString(),
  }));

  const wb = createStandardWorkbook({
    reportName: 'Work Order Report',
    description: 'Comprehensive work order listing with authoritative costs and timeline',
    plantId: filters.plantId,
    filters: flattenFilters(filters),
    generatedBy: session.fullName || session.userId,
    kpis: [
      { label: 'Total WOs', value: workOrders.length },
      {
        label: 'Completed / Verified / Closed',
        value: workOrders.filter((wo) => ['completed', 'verified', 'closed'].includes(wo.status)).length,
      },
      {
        label: 'In Progress / Waiting',
        value: workOrders.filter((wo) => ['assigned', 'in_progress', 'waiting_parts', 'waiting_tools', 'waiting_shutdown', 'waiting_permit', 'pending_handover'].includes(wo.status)).length,
      },
      { label: 'Total Cost', value: workOrders.reduce((sum, wo) => sum + (wo.totalCost ?? 0), 0).toFixed(2) },
    ],
  });

  addDataSheet(wb, 'Work Orders', WORK_ORDER_COLUMNS, rows);
  addAnalyticsSheet(wb, 'Status Breakdown', buildBreakdown(rows, 'status'));

  return {
    buffer: generateXlsxBuffer(wb),
    filename: buildFilename('work-order-report'),
  };
}

const MR_COLUMNS: ReportColumn[] = [
  { key: 'requestNumber', header: 'MR Number', width: 22 },
  { key: 'title', header: 'Title', width: 30 },
  { key: 'priority', header: 'Priority', width: 12 },
  { key: 'category', header: 'Category', width: 16 },
  { key: 'status', header: 'Status', width: 18 },
  { key: 'workflowStatus', header: 'Workflow Status', width: 22 },
  { key: 'assetName', header: 'Asset', width: 25 },
  { key: 'location', header: 'Location', width: 20 },
  { key: 'machineDown', header: 'Machine Down', width: 14 },
  { key: 'requestedByName', header: 'Requested By', width: 20 },
  { key: 'supervisorName', header: 'Supervisor', width: 20 },
  { key: 'woNumber', header: 'Linked WO', width: 22 },
  { key: 'plannedStart', header: 'Planned Start', format: 'datetime', width: 20 },
  { key: 'plannedEnd', header: 'Planned End', format: 'datetime', width: 20 },
  { key: 'createdAt', header: 'Created', format: 'datetime', width: 20 },
];

async function exportMaintenanceRequestReport(
  filters: ReportFilters,
  session: SessionData,
): Promise<ReportResult> {
  const where = buildMrWhere(filters);
  const requests = await db.maintenanceRequest.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      // Active Prisma schema relation is `requester`, not `requestedByUser`.
      requester: { select: { id: true, fullName: true } },
      supervisor: { select: { id: true, fullName: true } },
      workOrder: { select: { id: true, woNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = requests.map((mr) => ({
    requestNumber: mr.requestNumber,
    title: mr.title,
    priority: mr.priority,
    category: mr.category || '',
    status: mr.status,
    workflowStatus: mr.workflowStatus,
    assetName: mr.assetName || '',
    location: mr.location || '',
    machineDown: mr.machineDownStatus ? 'Yes' : 'No',
    requestedByName: mr.requester?.fullName || '',
    supervisorName: mr.supervisor?.fullName || '',
    woNumber: mr.workOrder?.woNumber || '',
    plannedStart: mr.plannedStart?.toISOString() ?? '',
    plannedEnd: mr.plannedEnd?.toISOString() ?? '',
    createdAt: mr.createdAt.toISOString(),
  }));

  const wb = createStandardWorkbook({
    reportName: 'Maintenance Request Report',
    description: 'Complete maintenance-request intake and workflow tracking',
    plantId: filters.plantId,
    filters: flattenFilters(filters),
    generatedBy: session.fullName || session.userId,
    kpis: [
      { label: 'Total MRs', value: requests.length },
      { label: 'Converted to WO', value: requests.filter((request) => Boolean(request.workOrder)).length },
      { label: 'Pending', value: requests.filter((request) => request.status === 'pending').length },
      { label: 'Machine Down', value: requests.filter((request) => request.machineDownStatus === true).length },
    ],
  });

  addDataSheet(wb, 'Maintenance Requests', MR_COLUMNS, rows);
  addAnalyticsSheet(wb, 'Workflow Breakdown', buildBreakdown(rows, 'workflowStatus'));

  return {
    buffer: generateXlsxBuffer(wb),
    filename: buildFilename('maintenance-request-report'),
  };
}

/**
 * Schema-safe Repairs report dispatcher.
 *
 * The Work Order and Maintenance Request exporters are overridden here because
 * the legacy exporter still references stale Prisma relation names. The other
 * eight exporters remain delegated to the existing implementation.
 */
export async function generateRepairsReport(
  reportType: ReportType,
  filters: ReportFilters,
  session: SessionData,
): Promise<ReportResult> {
  if (reportType === 'work-order') return exportWorkOrderReport(filters, session);
  if (reportType === 'maintenance-request') return exportMaintenanceRequestReport(filters, session);
  return generateLegacyReport(reportType, filters, session);
}
