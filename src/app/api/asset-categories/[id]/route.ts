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

    const category = await db.assetCategory.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: {
          include: {
            _count: { select: { children: true, assets: true } },
          },
          orderBy: { name: 'asc' },
        },
        _count: { select: { assets: true } },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Asset category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load asset category';
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

    if (!session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.assetCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Asset category not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const allowedFields = ['name', 'code', 'description', 'parentId', 'isActive'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Check code uniqueness if code is being updated
    if (updateData.code && updateData.code !== existing.code) {
      const codeExists = await db.assetCategory.findUnique({ where: { code: updateData.code as string } });
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Asset category code already exists' },
          { status: 400 }
        );
      }
    }

    // Prevent self-parent
    if (updateData.parentId === id) {
      return NextResponse.json(
        { success: false, error: 'Category cannot be its own parent' },
        { status: 400 }
      );
    }

    const updated = await db.assetCategory.update({
      where: { id },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true, code: true } },
        _count: { select: { children: true, assets: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'asset_category',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name, code: existing.code }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update asset category';
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

    if (!session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.assetCategory.findUnique({
      where: { id },
      include: { _count: { select: { assets: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Asset category not found' },
        { status: 404 }
      );
    }

    // Only soft-delete if no active assets
    if (existing._count.assets > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot deactivate category with existing assets' },
        { status: 400 }
      );
    }

    // Soft delete (isActive=false)
    const deactivated = await db.assetCategory.update({
      where: { id },
      data: { isActive: false },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'asset_category',
        entityId: id,
        oldValues: JSON.stringify({ name: existing.name, isActive: existing.isActive }),
        newValues: JSON.stringify({ isActive: false }),
      },
    });

    return NextResponse.json({ success: true, data: deactivated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate asset category';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
