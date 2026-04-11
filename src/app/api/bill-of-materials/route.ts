import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const where: Record<string, unknown> = {};

    if (parentId) where.parentId = parentId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { partNumber: { contains: search } },
        { notes: { contains: search } },
        { specification: { contains: search } },
        { parent: { name: { contains: search } } },
        { childAsset: { name: { contains: search } } },
      ];
    }

    const [items, total] = await Promise.all([
      db.billOfMaterial.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          parent: { select: { id: true, name: true, assetTag: true } },
          childAsset: { select: { id: true, name: true, assetTag: true, serialNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.billOfMaterial.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    const [totalKpi, activeCount, pendingCount, obsoleteCount, parentAssetCount] = await Promise.all([
      db.billOfMaterial.count(),
      db.billOfMaterial.count({ where: { status: 'active' } }),
      db.billOfMaterial.count({ where: { status: 'pending' } }),
      db.billOfMaterial.count({ where: { status: 'obsolete' } }),
      // Count unique parent assets
      (await db.billOfMaterial.findMany({ select: { parentId: true }, distinct: ['parentId'] })).length,
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      kpis: {
        totalBoms: parentAssetCount,
        components: totalKpi,
        active: activeCount,
        pending: pendingCount + obsoleteCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load bill of materials';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      parentId,
      childAssetId,
      partNumber,
      quantity,
      unit,
      specification,
      status,
      revision,
      notes,
    } = body;

    if (!parentId) {
      return NextResponse.json({ success: false, error: 'Parent asset is required' }, { status: 400 });
    }

    if (!childAssetId) {
      return NextResponse.json({ success: false, error: 'Component asset is required' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await db.billOfMaterial.findUnique({
      where: { parentId_childAssetId: { parentId, childAssetId } },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: 'This component is already in the BOM for this parent asset' }, { status: 409 });
    }

    const item = await db.billOfMaterial.create({
      data: {
        parentId,
        childAssetId,
        partNumber,
        quantity: quantity ? parseFloat(String(quantity)) : 1,
        unit: unit || 'each',
        specification,
        status: status || 'active',
        revision,
        notes,
      },
      include: {
        parent: { select: { id: true, name: true, assetTag: true } },
        childAsset: { select: { id: true, name: true, assetTag: true, serialNumber: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'bill_of_material',
        entityId: item.id,
        newValues: JSON.stringify({ parentId, childAssetId, partNumber }),
      },
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create BOM item';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
