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
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const categories = await db.assetCategory.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        parent: { select: { id: true, name: true, code: true } },
        _count: { select: { children: true, assets: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load asset categories';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, description, parentId } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Check code uniqueness
    const existing = await db.assetCategory.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Asset category code already exists' },
        { status: 400 }
      );
    }

    // Validate parent exists
    if (parentId) {
      const parent = await db.assetCategory.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json(
          { success: false, error: 'Parent category not found' },
          { status: 400 }
        );
      }
    }

    const category = await db.assetCategory.create({
      data: {
        name,
        code,
        description: description || null,
        parentId: parentId || null,
      },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        _count: { select: { children: true, assets: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'asset_category',
        entityId: category.id,
        newValues: JSON.stringify({ name, code, description, parentId }),
      },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create asset category';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
