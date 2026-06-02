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

    if (!hasPermission(session, 'predictive.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const componentId = searchParams.get('componentId');
    const assetId = searchParams.get('assetId');
    const trainingStatus = searchParams.get('trainingStatus');

    const where: Record<string, unknown> = {};
    if (componentId) where.componentId = componentId;
    if (assetId) where.assetId = assetId;
    if (trainingStatus) where.trainingStatus = trainingStatus;

    const models = await db.predictiveModel.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        component: { select: { id: true, componentCode: true, name: true, componentType: true } },
        asset: { select: { id: true, name: true, assetTag: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
        _count: { select: { alerts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: models });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load predictive models';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'predictive.analyze') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      modelName,
      modelType,
      description,
      componentId,
      assetId,
      algorithm,
      parameters,
      alertThreshold,
    } = body;

    if (!modelName) {
      return NextResponse.json({ success: false, error: 'modelName is required' }, { status: 400 });
    }

    if (!modelType) {
      return NextResponse.json({ success: false, error: 'modelType is required' }, { status: 400 });
    }

    if (!body.createdById) {
      return NextResponse.json({ success: false, error: 'createdById is required' }, { status: 400 });
    }

    // Validate componentId if provided
    if (componentId) {
      const comp = await db.componentRegistry.findUnique({ where: { id: componentId } });
      if (!comp) {
        return NextResponse.json({ success: false, error: 'Component not found' }, { status: 404 });
      }
    }

    const model = await db.predictiveModel.create({
      data: {
        modelName,
        modelType,
        description,
        componentId,
        assetId,
        algorithm,
        parameters: parameters ? (typeof parameters === 'string' ? parameters : JSON.stringify(parameters)) : null,
        trainingStatus: 'pending',
        alertThreshold: alertThreshold ? parseFloat(String(alertThreshold)) : null,
        createdById: session.userId,
      },
      include: {
        component: { select: { id: true, componentCode: true, name: true } },
        asset: { select: { id: true, name: true, assetTag: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await createAuditLog(
      session.userId,
      'predictive_model',
      'create',
      model.id,
      { newValues: { modelName, modelType, componentId, assetId } },
    );

    return NextResponse.json({ success: true, data: model }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create predictive model';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
