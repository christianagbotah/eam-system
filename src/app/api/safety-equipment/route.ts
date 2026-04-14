import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

// Helper: generate equipment code SEQ-NNNN
async function generateEquipmentCode(): Promise<string> {
  const latest = await db.safetyEquipment.findFirst({
    orderBy: { code: 'desc' },
    select: { code: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.code.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `SEQ-${String(nextNum).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const condition = searchParams.get('condition');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (condition) where.condition = condition;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const [equipment, total] = await Promise.all([
      db.safetyEquipment.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.safetyEquipment.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, availableCount, inUseCount, expiredCount, disposedCount] = await Promise.all([
      db.safetyEquipment.count(),
      db.safetyEquipment.count({ where: { status: 'available' } }),
      db.safetyEquipment.count({ where: { status: 'in_use' } }),
      db.safetyEquipment.count({ where: { status: 'expired' } }),
      db.safetyEquipment.count({ where: { status: 'disposed' } }),
    ]);

    // Due for inspection: no nextInspection date or nextInspection is past
    const dueInspectionCount = await db.safetyEquipment.count({
      where: {
        OR: [
          { nextInspection: null },
          { nextInspection: { lte: new Date(Date.now() + 30 * 86400000) } },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      data: equipment,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: {
        total: totalCount,
        available: availableCount,
        inUse: inUseCount,
        expired: expiredCount,
        disposed: disposedCount,
        dueInspection: dueInspectionCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load safety equipment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'safety_equipment.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      type,
      status,
      location,
      quantity,
      expiryDate,
      lastInspected,
      nextInspection,
      condition,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Equipment name is required' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ success: false, error: 'Equipment type is required' }, { status: 400 });
    }

    const code = await generateEquipmentCode();

    const equipment = await db.safetyEquipment.create({
      data: {
        code,
        name,
        type,
        status: status || 'available',
        location: location || null,
        quantity: quantity || 1,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        lastInspected: lastInspected ? new Date(lastInspected) : null,
        nextInspection: nextInspection ? new Date(nextInspection) : null,
        condition: condition || 'good',
        notes: notes || null,
        createdById: session.userId,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'safety_equipment',
        entityId: equipment.id,
        newValues: JSON.stringify({ code, name, type }),
      },
    });

    return NextResponse.json({ success: true, data: equipment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create safety equipment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
