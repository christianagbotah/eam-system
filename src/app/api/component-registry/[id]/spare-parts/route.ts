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

    const component = await db.componentRegistry.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!component) {
      return NextResponse.json({ success: false, error: 'Component not found' }, { status: 404 });
    }

    const spareParts = await db.componentSparePart.findMany({
      where: { componentId: id },
      include: {
        inventoryItem: {
          select: { id: true, itemCode: true, name: true, currentStock: true, unitOfMeasure: true, unitCost: true, location: true },
        },
      },
      orderBy: { sparePartName: 'asc' },
    });

    return NextResponse.json({ success: true, data: spareParts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load spare parts';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.manage') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { inventoryItemId, sparePartName, sparePartCode, quantityRequired, unitCost, leadTimeDays, criticality, notes } = body;

    if (!sparePartName) {
      return NextResponse.json({ success: false, error: 'sparePartName is required' }, { status: 400 });
    }

    const component = await db.componentRegistry.findUnique({ where: { id } });
    if (!component) {
      return NextResponse.json({ success: false, error: 'Component not found' }, { status: 404 });
    }

    // Validate inventoryItemId if provided
    if (inventoryItemId) {
      const item = await db.inventoryItem.findUnique({ where: { id: inventoryItemId } });
      if (!item) {
        return NextResponse.json({ success: false, error: 'Inventory item not found' }, { status: 404 });
      }
    }

    const sparePart = await db.componentSparePart.create({
      data: {
        componentId: id,
        inventoryItemId,
        sparePartName,
        sparePartCode: sparePartCode || '',
        quantityRequired: quantityRequired ? parseInt(String(quantityRequired), 10) : 1,
        unitCost: unitCost ? parseFloat(String(unitCost)) : null,
        leadTimeDays: leadTimeDays ? parseInt(String(leadTimeDays), 10) : null,
        criticality: criticality || 'medium',
        notes,
      },
      include: {
        inventoryItem: { select: { id: true, itemCode: true, name: true, currentStock: true, unitOfMeasure: true } },
      },
    });

    await createAuditLog(
      session.userId,
      'component_spare_part',
      'create',
      sparePart.id,
      { newValues: { componentId: id, sparePartName, sparePartCode } },
    );

    return NextResponse.json({ success: true, data: sparePart }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add spare part';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
