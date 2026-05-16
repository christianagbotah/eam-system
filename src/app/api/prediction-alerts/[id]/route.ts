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

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const alert = await db.predictionAlert.findUnique({
      where: { id },
      include: {
        predictiveModel: {
          select: { id: true, modelName: true, modelType: true, trainingStatus: true, accuracy: true },
        },
        component: {
          select: { id: true, componentCode: true, name: true, componentType: true, healthScore: true },
        },
        asset: { select: { id: true, name: true, assetTag: true, status: true } },
        acknowledgedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!alert) {
      return NextResponse.json({ success: false, error: 'Prediction alert not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: alert });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load prediction alert';
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

    if (!hasPermission(session, 'digital_twin.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.predictionAlert.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Prediction alert not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Handle acknowledge action
    if (body.acknowledge === true && !existing.isAcknowledged) {
      updateData.isAcknowledged = true;
      updateData.acknowledgedById = session.userId;
      updateData.acknowledgedAt = new Date();
    }

    // Handle resolve action
    if (body.resolve === true && !existing.resolvedAt) {
      updateData.resolvedAt = new Date();
      if (!existing.isAcknowledged) {
        updateData.isAcknowledged = true;
        updateData.acknowledgedById = session.userId;
        updateData.acknowledgedAt = new Date();
      }
    }

    // Allow direct field updates
    const directFields = ['severity', 'message', 'recommendations'];
    for (const field of directFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await db.predictionAlert.update({
      where: { id },
      data: updateData,
      include: {
        predictiveModel: { select: { id: true, modelName: true, modelType: true } },
        component: { select: { id: true, componentCode: true, name: true } },
        asset: { select: { id: true, name: true, assetTag: true } },
        acknowledgedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await createAuditLog(
      session.userId,
      'prediction_alert',
      'update',
      id,
      { oldValues: { isAcknowledged: existing.isAcknowledged, resolved: !!existing.resolvedAt }, newValues: updateData },
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update prediction alert';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
