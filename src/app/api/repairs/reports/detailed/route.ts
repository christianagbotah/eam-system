import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPlantScope, canAccessPlant, applyPlantScope } from '@/lib/plant-scope';
import * as XLSX from 'xlsx';

// GET /api/repairs/reports/detailed — Machine + Parts repair report
// Query params: dateFrom, dateTo, status, type, plantId, format (json|xlsx), page, limit
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const requestedPlantId = searchParams.get('plantId');
    const format = searchParams.get('format') || 'json';

    // Pagination params (used for JSON format; XLSX always fetches full filtered set)
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '50', 10) || 50));

    // Build where clause for completed WOs
    const where: Record<string, unknown> = {};

    // Only show repair-type WOs (corrective, emergency, predictive)
    if (type) {
      where.type = type;
    } else {
      where.type = { in: ['corrective', 'emergency', 'predictive'] };
    }

    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['completed', 'verified', 'closed'] };
    }

    // Apply plant scope before any report query. An explicit X-Plant-ID wins over
    // query-string selection; a query-string plant must still belong to the caller.
    // With neither selected, filter to ALL plants the caller is assigned to.
    if (plantScope.isScoped && plantScope.plantId) {
      if (requestedPlantId && requestedPlantId !== plantScope.plantId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
      where.plantId = plantScope.plantId;
    } else if (requestedPlantId) {
      if (!canAccessPlant(plantScope, requestedPlantId)) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
      where.plantId = requestedPlantId;
    } else {
      applyPlantScope(where, plantScope);
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.createdAt = dateFilter;
    }

    const filterWhere = Object.keys(where).length > 0 ? where : undefined;

    // Count total matching WOs for pagination
    const total = await db.workOrder.count({ where: filterWhere });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // For XLSX, fetch all (capped at 100 for memory safety); for JSON, paginate
    const usePagination = format !== 'xlsx';
    const skip = usePagination ? (page - 1) * limit : 0;
    const take = usePagination ? limit : Math.min(100, total);

    // WorkOrder stores assetId/assetName as scalar fields and has no Prisma asset
    // relation. Fetch WOs first, then resolve referenced assets explicitly in bulk.
    const workOrders = await db.workOrder.findMany({
      where: filterWhere,
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        workOrderComponents: {
          include: {
            componentRegistry: {
              include: {
                asset: { select: { id: true, name: true } },
                sparePartLinks: {
                  include: {
                    inventoryItem: { select: { id: true, itemCode: true, name: true, currentStock: true, unitCost: true } },
                  },
                },
              },
            },
          },
        },
        repairCompletion: {
          select: {
            findings: true,
            rootCause: true,
            correctiveAction: true,
            totalLaborHours: true,
            totalMaterialCost: true,
            totalDowntimeMinutes: true,
            completionNotes: true,
          },
        },
        repairMaterialRequests: {
          include: {
            item: { select: { itemCode: true, name: true } },
            componentRegistry: { select: { id: true, name: true, componentCode: true } },
          },
        },
        failureRecords: {
          select: {
            failureMode: true,
            failureCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    const assetIds = [
      ...new Set(
        workOrders
          .map((wo) => wo.assetId)
          .filter((assetId): assetId is string => Boolean(assetId)),
      ),
    ];
    const assets = assetIds.length > 0
      ? await db.asset.findMany({
          where: { id: { in: assetIds } },
          select: { id: true, name: true, assetTag: true, serialNumber: true },
        })
      : [];
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

    // Transform into report rows (one row per WO-component pair)
    const rows: Record<string, unknown>[] = [];

    for (const wo of workOrders) {
      const asset = wo.assetId ? assetMap.get(wo.assetId) : undefined;
      const components = wo.workOrderComponents;
      const completion = wo.repairCompletion;
      const materials = wo.repairMaterialRequests;
      const failures = wo.failureRecords;

      if (components.length === 0) {
        // WO with no linked components — still show the WO
        rows.push({
          'WO Number': wo.woNumber,
          'Machine Name': asset?.name || wo.assetName || 'N/A',
          'Machine Tag': asset?.assetTag || 'N/A',
          'Serial Number': asset?.serialNumber || 'N/A',
          'Component/Part': '(No component specified)',
          'Component Code': '',
          'Component Type': '',
          'Component Criticality': '',
          'WO Type': wo.type,
          'Priority': wo.priority,
          'Status': wo.status,
          'Assigned To': wo.assignee?.fullName || 'N/A',
          'Failure Description': wo.failureDescription || '',
          'Failure Mode': failures.map((f) => f.failureMode).join(', ') || '',
          'Root Cause': completion?.rootCause || '',
          'Corrective Action': completion?.correctiveAction || '',
          'Findings': completion?.findings || '',
          'Materials Used': materials.map((m) => `${m.itemName} (Qty: ${m.quantityIssued})`).join('; ') || '',
          'Total Material Cost': wo.partsCost,
          'Labor Hours': completion?.totalLaborHours || wo.actualHours || 0,
          'Downtime (mins)': completion?.totalDowntimeMinutes || 0,
          'Total Cost': wo.totalCost,
          'Started': wo.actualStart?.toISOString().split('T')[0] || '',
          'Completed': wo.actualEnd?.toISOString().split('T')[0] || '',
          'Completion Notes': completion?.completionNotes || '',
        });
      } else {
        // One row per component
        for (const woc of components) {
          const comp = woc.componentRegistry;
          const compMaterials = materials.filter(
            (m) => m.componentRegistryId === comp.id
          );

          rows.push({
            'WO Number': wo.woNumber,
            'Machine Name': asset?.name || wo.assetName || 'N/A',
            'Machine Tag': asset?.assetTag || 'N/A',
            'Serial Number': asset?.serialNumber || 'N/A',
            'Component/Part': comp.name,
            'Component Code': comp.componentCode,
            'Component Type': comp.componentType,
            'Component Criticality': comp.criticality,
            'WO Type': wo.type,
            'Priority': wo.priority,
            'Status': wo.status,
            'Assigned To': wo.assignee?.fullName || 'N/A',
            'Failure Description': wo.failureDescription || '',
            'Failure Mode': failures.map((f) => f.failureMode).join(', ') || '',
            'Root Cause': completion?.rootCause || '',
            'Corrective Action': completion?.correctiveAction || '',
            'Findings': completion?.findings || '',
            'Materials Used': compMaterials
              .map((m) => `${m.itemName} (Qty: ${m.quantityIssued})`)
              .join('; ') || '',
            'Total Material Cost': wo.partsCost,
            'Labor Hours': completion?.totalLaborHours || wo.actualHours || 0,
            'Downtime (mins)': completion?.totalDowntimeMinutes || 0,
            'Total Cost': wo.totalCost,
            'Started': wo.actualStart?.toISOString().split('T')[0] || '',
            'Completed': wo.actualEnd?.toISOString().split('T')[0] || '',
            'Completion Notes': woc.notes || completion?.completionNotes || '',
          });
        }
      }
    }

    // JSON response (paginated)
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: rows,
        summary: {
          totalWorkOrders: workOrders.length,
          totalRows: rows.length,
          workOrdersWithComponents: workOrders.filter((wo) => wo.workOrderComponents.length > 0).length,
          workOrdersWithoutComponents: workOrders.filter((wo) => wo.workOrderComponents.length === 0).length,
        },
        pagination: { page, limit, total, totalPages },
      });
    }

    // Excel response (full filtered set, no pagination)
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length + 2, 15),
    }));
    ws['!cols'] = colWidths;

    // Add summary sheet
    const summaryData = [
      { 'Metric': 'Total Work Orders', 'Value': workOrders.length },
      { 'Metric': 'WOs with Components Specified', 'Value': workOrders.filter((wo) => wo.workOrderComponents.length > 0).length },
      { 'Metric': 'WOs without Components', 'Value': workOrders.filter((wo) => wo.workOrderComponents.length === 0).length },
      { 'Metric': 'Total Report Rows', 'Value': rows.length },
      { 'Metric': 'Total Material Cost', 'Value': workOrders.reduce((sum, wo) => sum + wo.partsCost, 0) },
      { 'Metric': 'Total Labor Hours', 'Value': workOrders.reduce((sum, wo) => sum + (wo.actualHours || 0), 0) },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Repair Details');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=\"repair-details-${new Date().toISOString().split('T')[0]}.xlsx\"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
