import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const item = await db.billOfMaterial.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, assetTag: true } },
        childAsset: { select: { id: true, name: true, assetTag: true, serialNumber: true } },
      },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: 'BOM item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load BOM item';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.billOfMaterial.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'BOM item not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'parentId', 'childAssetId', 'partNumber', 'quantity',
      'unit', 'specification', 'status', 'revision', 'notes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'quantity') {
          updateData[field] = body[field] !== null ? parseFloat(String(body[field])) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.billOfMaterial.update({
      where: { id },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true, assetTag: true } },
        childAsset: { select: { id: true, name: true, assetTag: true, serialNumber: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'bill_of_material',
        entityId: id,
        oldValues: JSON.stringify({ parentId: existing.parentId, childAssetId: existing.childAssetId }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update BOM item';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.billOfMaterial.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'BOM item not found' }, { status: 404 });
    }

    await db.billOfMaterial.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'bill_of_material',
        entityId: id,
        oldValues: JSON.stringify({ parentId: existing.parentId, childAssetId: existing.childAssetId }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete BOM item';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
