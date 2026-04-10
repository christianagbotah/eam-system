import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const plants = await db.plant.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { departments: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: plants });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load plants';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session) || !hasPermission(session, 'plants.create')) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, location, country, city } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Check code uniqueness
    const existing = await db.plant.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Plant code already exists' },
        { status: 400 }
      );
    }

    const plant = await db.plant.create({
      data: {
        name,
        code,
        location: location || null,
        country: country || null,
        city: city || null,
      },
    });

    return NextResponse.json({ success: true, data: plant }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create plant';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
