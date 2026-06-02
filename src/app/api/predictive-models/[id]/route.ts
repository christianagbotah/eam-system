import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'predictive.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const model = await db.predictiveModel.findUnique({
      where: { id },
      include: {
        component: { select: { id: true, componentCode: true, name: true, componentType: true, healthScore: true } },
        asset: { select: { id: true, name: true, assetTag: true, status: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { alerts: true } },
      },
    });

    if (!model) {
      return NextResponse.json({ success: false, error: 'Predictive model not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: model });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load predictive model';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'predictive.analyze') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.predictiveModel.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Predictive model not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'modelName', 'modelType', 'description', 'algorithm', 'parameters',
      'trainingStatus', 'accuracy', 'lastTrainedAt', 'dataPoints',
      'alertThreshold', 'isActive', 'componentId', 'assetId',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'lastTrainedAt' && body[field] !== null) {
          updateData[field] = new Date(body[field]);
        } else if (['accuracy', 'alertThreshold'].includes(field)) {
          updateData[field] = body[field] !== null ? parseFloat(String(body[field])) : null;
        } else if (['dataPoints'].includes(field)) {
          updateData[field] = parseInt(String(body[field]), 10);
        } else if (['parameters'].includes(field)) {
          updateData[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.predictiveModel.update({
      where: { id },
      data: updateData,
      include: {
        component: { select: { id: true, componentCode: true, name: true } },
        asset: { select: { id: true, name: true, assetTag: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
        _count: { select: { alerts: true } },
      },
    });

    await createAuditLog(
      session.userId,
      'predictive_model',
      'update',
      id,
      { oldValues: { modelName: existing.modelName, trainingStatus: existing.trainingStatus }, newValues: updateData },
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update predictive model';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'predictive.analyze') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.predictiveModel.findUnique({
      where: { id },
      include: { _count: { select: { alerts: true } } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Predictive model not found' }, { status: 404 });
    }

    // Delete cascades to alerts via onDelete: Cascade in schema
    await db.predictiveModel.delete({ where: { id } });

    await createAuditLog(
      session.userId,
      'predictive_model',
      'delete',
      id,
      { oldValues: { modelName: existing.modelName, alertCount: existing._count.alerts } },
    );

    return NextResponse.json({ success: true, data: { deleted: true, cascadeDeleted: existing._count.alerts } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete predictive model';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
