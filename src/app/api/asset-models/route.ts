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
    const search = searchParams.get('search');
    const assetId = searchParams.get('assetId');
    const format = searchParams.get('format');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { fileName: { contains: search } },
        { asset: { name: { contains: search } } },
        { asset: { assetTag: { contains: search } } },
      ];
    }

    if (assetId) {
      where.assetId = assetId;
    }

    if (format) {
      where.format = format;
    }

    const [models, total] = await Promise.all([
      db.assetModel.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true } },
          uploadedBy: { select: { id: true, fullName: true, username: true } },
          _count: { select: { meshBindings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.assetModel.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: models,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load asset models';
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
    const { assetId, name, description, fileName, fileSize, fileType, fileUrl, format, meshCount, vertices } = body;

    if (!assetId) {
      return NextResponse.json({ success: false, error: 'Asset ID is required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ success: false, error: 'Model name is required' }, { status: 400 });
    }

    // Verify asset exists
    const asset = await db.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    const model = await db.assetModel.create({
      data: {
        assetId,
        name,
        description: description || null,
        fileName: fileName || null,
        fileSize: fileSize ? parseFloat(String(fileSize)) : null,
        fileType: fileType || null,
        fileUrl: fileUrl || null,
        format: format || 'gltf',
        meshCount: meshCount ? parseInt(String(meshCount), 10) : null,
        vertices: vertices ? parseInt(String(vertices), 10) : null,
        uploadedById: session.userId,
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true } },
        uploadedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'asset_model',
        entityId: model.id,
        newValues: JSON.stringify({ name, assetId, format: format || 'gltf' }),
      },
    });

    return NextResponse.json({ success: true, data: model }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create asset model';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
