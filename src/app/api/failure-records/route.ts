import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const componentId = searchParams.get('componentId');
    const assetId = searchParams.get('assetId');
    const failureMode = searchParams.get('failureMode');
    const failureSeverity = searchParams.get('failureSeverity');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    let page = parseInt(searchParams.get('page') || '1', 10);
    let limit = parseInt(searchParams.get('limit') || '50', 10);
    page = Math.max(1, isNaN(page) ? 1 : page);
    limit = Math.min(100, Math.max(1, isNaN(limit) ? 50 : limit));

    const where: Record<string, unknown> = {};

    if (componentId) where.componentId = componentId;
    if (assetId) where.assetId = assetId;
    if (failureMode) where.failureMode = failureMode;
    if (failureSeverity) where.failureSeverity = failureSeverity;

    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.detectedAt = dateFilter;
    }

    const [records, total] = await Promise.all([
      db.failureRecord.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          component: {
            select: { id: true, componentCode: true, name: true, componentType: true },
          },
          asset: { select: { id: true, name: true, assetTag: true } },
          workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
          reportedBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { detectedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.failureRecord.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load failure records';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      componentId,
      assetId,
      workOrderId,
      failureCode,
      failureMode,
      failureCause,
      failureSeverity,
      symptoms,
      detectedAt,
      downtimeMinutes,
      repairCost,
      rootCause,
      correctiveAction,
      preventiveAction,
    } = body;

    if (!componentId) {
      return NextResponse.json({ success: false, error: 'componentId is required' }, { status: 400 });
    }

    if (!failureMode) {
      return NextResponse.json({ success: false, error: 'failureMode is required' }, { status: 400 });
    }

    // Validate component exists
    const component = await db.componentRegistry.findUnique({ where: { id: componentId } });
    if (!component) {
      return NextResponse.json({ success: false, error: 'Component not found' }, { status: 404 });
    }

    // Validate workOrderId if provided
    if (workOrderId) {
      const wo = await db.workOrder.findUnique({ where: { id: workOrderId } });
      if (!wo) {
        return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
      }
    }

    const record = await db.failureRecord.create({
      data: {
        componentId,
        assetId: assetId || component.assetId,
        workOrderId,
        failureCode,
        failureMode,
        failureCause,
        failureSeverity: failureSeverity || 'medium',
        symptoms: symptoms ? (typeof symptoms === 'string' ? symptoms : JSON.stringify(symptoms)) : null,
        detectedAt: detectedAt ? new Date(detectedAt) : new Date(),
        downtimeMinutes: downtimeMinutes ? parseInt(String(downtimeMinutes), 10) : 0,
        repairCost: repairCost ? parseFloat(String(repairCost)) : null,
        rootCause,
        correctiveAction,
        preventiveAction,
        reportedById: session.userId,
      },
      include: {
        component: { select: { id: true, componentCode: true, name: true } },
        asset: { select: { id: true, name: true, assetTag: true } },
        workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
        reportedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await createAuditLog(
      session.userId,
      'failure_record',
      'create',
      record.id,
      { newValues: { componentId, failureMode, failureSeverity, assetId } },
    );

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create failure record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
