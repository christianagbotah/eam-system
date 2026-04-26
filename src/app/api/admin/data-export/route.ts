import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

// Simple in-memory rate limiter: max 1 export per 5 minutes per user
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

// Supported export modules and their Prisma model names
const SUPPORTED_MODULES: Record<string, string> = {
  'assets': 'assets',
  'work-orders': 'workOrders',
  'maintenance-requests': 'maintenanceRequests',
  'inventory': 'inventoryItems',
  'users': 'users',
  'safety-incidents': 'safetyIncidents',
  'quality-inspections': 'qualityInspections',
  'production-orders': 'productionOrders',
  'pm-schedules': 'pmSchedules',
};

// Module display labels for CSV section headers
const MODULE_LABELS: Record<string, string> = {
  'assets': 'Assets',
  'work-orders': 'Work Orders',
  'maintenance-requests': 'Maintenance Requests',
  'inventory': 'Inventory Items',
  'users': 'Users',
  'safety-incidents': 'Safety Incidents',
  'quality-inspections': 'Quality Inspections',
  'production-orders': 'Production Orders',
  'pm-schedules': 'PM Schedules',
};

// Fields to select for each module (exclude sensitive fields like passwordHash)
const MODULE_FIELDS: Record<string, string[]> = {
  'assets': [
    'id', 'name', 'assetTag', 'description', 'serialNumber', 'manufacturer', 'model',
    'condition', 'status', 'criticality', 'location', 'building', 'floor', 'area',
    'plantId', 'departmentId', 'purchaseDate', 'purchaseCost', 'warrantyExpiry',
    'installedDate', 'expectedLifeYears', 'currentValue', 'depreciationRate',
    'isActive', 'createdAt', 'updatedAt',
  ],
  'work-orders': [
    'id', 'woNumber', 'title', 'description', 'type', 'priority', 'status',
    'assetId', 'assetName', 'departmentId', 'assignedTo', 'teamLeaderId',
    'assignedSupervisorId', 'plannerId', 'estimatedHours', 'actualHours',
    'plannedStart', 'plannedEnd', 'actualStart', 'actualEnd', 'totalCost',
    'laborCost', 'partsCost', 'contractorCost', 'plantId', 'isLocked',
    'createdAt', 'updatedAt',
  ],
  'maintenance-requests': [
    'id', 'requestNumber', 'title', 'description', 'priority', 'category', 'status',
    'workflowStatus', 'machineDownStatus', 'assetId', 'departmentId', 'requestedBy',
    'supervisorId', 'approvedBy', 'assignedPlannerId', 'workOrderId', 'plantId',
    'plannedStart', 'plannedEnd', 'estimatedHours', 'slaHours', 'escalationLevel',
    'createdAt', 'updatedAt',
  ],
  'inventory': [
    'id', 'itemCode', 'name', 'description', 'category', 'unitOfMeasure',
    'currentStock', 'minStockLevel', 'maxStockLevel', 'reorderQuantity',
    'unitCost', 'supplier', 'supplierPartNumber', 'location', 'binLocation',
    'shelfLocation', 'plantId', 'isActive', 'createdAt', 'updatedAt',
  ],
  'users': [
    'id', 'username', 'email', 'fullName', 'staffId', 'phone', 'department',
    'status', 'isVendorAdmin', 'createdAt', 'updatedAt',
  ],
  'safety-incidents': [
    'id', 'incidentNumber', 'title', 'description', 'type', 'severity', 'status',
    'incidentDate', 'location', 'assetId', 'departmentId', 'plantId',
    'reportedById', 'investigatedById', 'rootCause', 'correctiveAction',
    'daysLost', 'cost', 'escalationLevel', 'createdAt', 'updatedAt',
  ],
  'quality-inspections': [
    'id', 'inspectionNumber', 'title', 'description', 'type', 'status',
    'orderId', 'assetId', 'itemId', 'plantId', 'inspectedById',
    'scheduledDate', 'completedDate', 'result', 'createdAt', 'updatedAt',
  ],
  'production-orders': [
    'id', 'orderNumber', 'title', 'description', 'status', 'priority',
    'productId', 'productName', 'quantity', 'completedQty', 'unitCost',
    'workCenterId', 'plantId', 'scheduledStart', 'scheduledEnd',
    'actualStart', 'actualEnd', 'createdAt', 'updatedAt',
  ],
  'pm-schedules': [
    'id', 'title', 'description', 'assetId', 'frequencyType', 'frequencyValue',
    'lastCompletedDate', 'nextDueDate', 'estimatedDuration', 'priority',
    'assignedToId', 'departmentId', 'isActive', 'autoGenerateWO', 'leadDays',
    'createdAt', 'updatedAt',
  ],
};

// CSV escape helper
function csvEscape(val: unknown): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Convert an array of records to CSV string
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

// Serialize date fields for JSON export
function serializeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value instanceof Date) {
      serialized[key] = value.toISOString();
    } else {
      serialized[key] = value;
    }
  }
  return serialized;
}

export async function GET(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Rate limiting check
    const now = Date.now();
    const lastExport = rateLimitMap.get(session.userId);
    if (lastExport && (now - lastExport) < RATE_LIMIT_MS) {
      const remainingMs = RATE_LIMIT_MS - (now - lastExport);
      const remainingSec = Math.ceil(remainingMs / 1000);
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${remainingSec}s before next export.` },
        { status: 429 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';
    const modulesParam = searchParams.get('modules') || '';

    // Determine which modules to export
    let modulesToExport: string[];
    if (modulesParam) {
      modulesToExport = modulesParam.split(',').map(m => m.trim()).filter(m => SUPPORTED_MODULES[m]);
    } else {
      modulesToExport = Object.keys(SUPPORTED_MODULES);
    }

    if (modulesToExport.length === 0) {
      return NextResponse.json({ error: 'No valid modules specified for export' }, { status: 400 });
    }

    // Fetch data for each module in parallel
    const moduleData: Record<string, unknown[]> = {};
    const moduleCounts: Record<string, number> = {};

    await Promise.all(modulesToExport.map(async (moduleKey) => {
      const fields = MODULE_FIELDS[moduleKey];
      const modelName = SUPPORTED_MODULES[moduleKey];

      // Build a Prisma select object from field list
      const selectObj: Record<string, boolean> = {};
      for (const f of fields) {
        selectObj[f] = true;
      }

      try {
        // @ts-ignore - dynamic model access via string key
        const records = await db[modelName].findMany({
          select: selectObj,
          orderBy: { createdAt: 'desc' },
        });

        moduleData[moduleKey] = records;
        moduleCounts[moduleKey] = records.length;
      } catch (err) {
        console.error(`Export error for module ${moduleKey}:`, err);
        moduleData[moduleKey] = [];
        moduleCounts[moduleKey] = 0;
      }
    }));

    // Update rate limit
    rateLimitMap.set(session.userId, Date.now());
    // Cleanup old rate limit entries (keep last 100)
    if (rateLimitMap.size > 100) {
      const entries = [...rateLimitMap.entries()].sort((a, b) => a[1] - b[1]);
      for (let i = 0; i < entries.length - 50; i++) {
        rateLimitMap.delete(entries[i][0]);
      }
    }

    const totalRecords = Object.values(moduleCounts).reduce((sum, c) => sum + c, 0);

    if (format === 'csv') {
      // Build CSV with sections separated by blank lines and module headers
      const sections: string[] = [];

      for (const moduleKey of modulesToExport) {
        const records = moduleData[moduleKey] as Record<string, unknown>[];
        if (records.length === 0) continue;

        // Serialize dates for CSV
        const serializedRecords = records.map(serializeRecord);

        sections.push(`### ${MODULE_LABELS[moduleKey] || moduleKey} (${records.length} records)`);
        sections.push(toCSV(serializedRecords));
      }

      const csvContent = sections.join('\n\n');
      const filename = `eam-export-${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Total-Records': String(totalRecords),
          'X-Modules-Exported': String(modulesToExport.length),
        },
      });
    }

    // JSON format (default)
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      modules: modulesToExport,
      summary: {
        totalRecords,
        moduleCounts,
      },
      data: moduleData,
    };

    const filename = `eam-export-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
