import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

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
    const predictiveModelId = searchParams.get('predictiveModelId');
    const componentId = searchParams.get('componentId');
    const assetId = searchParams.get('assetId');
    const severity = searchParams.get('severity');
    const isAcknowledged = searchParams.get('isAcknowledged');
    let page = parseInt(searchParams.get('page') || '1', 10);
    let limit = parseInt(searchParams.get('limit') || '50', 10);
    page = Math.max(1, isNaN(page) ? 1 : page);
    limit = Math.min(100, Math.max(1, isNaN(limit) ? 50 : limit));

    const where: Record<string, unknown> = {};

    if (predictiveModelId) where.predictiveModelId = predictiveModelId;
    if (componentId) where.componentId = componentId;
    if (assetId) where.assetId = assetId;
    if (severity) where.severity = severity;
    if (isAcknowledged !== null && isAcknowledged !== undefined && isAcknowledged !== '') {
      where.isAcknowledged = isAcknowledged === 'true';
    }

    const [alerts, total] = await Promise.all([
      db.predictionAlert.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          predictiveModel: { select: { id: true, modelName: true, modelType: true } },
          component: { select: { id: true, componentCode: true, name: true } },
          asset: { select: { id: true, name: true, assetTag: true } },
          acknowledgedBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.predictionAlert.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: alerts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load prediction alerts';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
