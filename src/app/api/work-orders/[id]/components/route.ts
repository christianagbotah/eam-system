import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';

// GET /api/work-orders/[id]/components — Get components linked to a WO
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

    // Plant authorization
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    const components = await db.workOrderComponent.findMany({
      where: { workOrderId: id },
      include: {
        componentRegistry: {
          include: {
            asset: { select: { id: true, name: true } },
            sparePartLinks: {
              include: {
                inventoryItem: { select: { id: true, itemCode: true, name: true, currentStock: true, unitCost: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: components });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load work order components';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/work-orders/[id]/components — Set/replace components for a WO
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.update')) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { componentIds, notes } = body as { componentIds?: string[]; notes?: Record<string, string> };

    if (!componentIds || !Array.isArray(componentIds)) {
      return NextResponse.json({ success: false, error: 'componentIds array is required' }, { status: 400 });
    }

    // Verify WO exists
    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // Delete existing links
    await db.workOrderComponent.deleteMany({ where: { workOrderId: id } });

    // Create new links
    if (componentIds.length > 0) {
      await db.workOrderComponent.createMany({
        data: componentIds.map((cid) => ({
          workOrderId: id,
          componentRegistryId: cid,
          notes: notes?.[cid] || null,
        })),
      });
    }

    // Return updated list
    const components = await db.workOrderComponent.findMany({
      where: { workOrderId: id },
      include: {
        componentRegistry: {
          include: {
            asset: { select: { id: true, name: true } },
            sparePartLinks: {
              include: {
                inventoryItem: { select: { id: true, itemCode: true, name: true, currentStock: true, unitCost: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: components });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update work order components';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
