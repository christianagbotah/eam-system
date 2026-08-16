import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'work_orders.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { componentId, parameterKey, value, unit, acceptableMin, acceptableMax } = body;

    if (!parameterKey || typeof parameterKey !== 'string') {
      return NextResponse.json({ success: false, error: 'parameterKey is required' }, { status: 400 });
    }
    if (value === undefined || value === null || typeof value !== 'number') {
      return NextResponse.json({ success: false, error: 'value is required and must be a number' }, { status: 400 });
    }
    if (!unit || typeof unit !== 'string') {
      return NextResponse.json({ success: false, error: 'unit is required' }, { status: 400 });
    }

    // Fetch WO with its components
    const wo = await db.workOrder.findUnique({
      where: { id },
      include: { workOrderComponents: { select: { componentRegistryId: true } } },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // Resolve componentId
    let resolvedComponentId = componentId;
    if (!resolvedComponentId) {
      if (wo.workOrderComponents.length > 0) {
        resolvedComponentId = wo.workOrderComponents[0].componentRegistryId;
      } else {
        return NextResponse.json(
          { success: false, error: 'No components linked to this work order. Provide a componentId.' },
          { status: 400 }
        );
      }
    } else {
      // Validate the componentId belongs to this WO
      const match = wo.workOrderComponents.find(c => c.componentRegistryId === resolvedComponentId);
      if (!match) {
        return NextResponse.json(
          { success: false, error: 'componentId does not belong to this work order' },
          { status: 400 }
        );
      }
    }

    // Determine alarm status
    let isAlarm = false;
    const minThreshold = acceptableMin ?? null;
    const maxThreshold = acceptableMax ?? null;
    if (minThreshold !== null && value < minThreshold) isAlarm = true;
    if (maxThreshold !== null && value > maxThreshold) isAlarm = true;

    const reading = await db.componentConditionReading.create({
      data: {
        componentId: resolvedComponentId,
        parameterKey,
        value,
        unit,
        quality: 100,
        minThreshold,
        maxThreshold,
        isAlarm,
        source: 'manual',
        recordedById: session.userId,
      },
      include: {
        recordedBy: { select: { id: true, fullName: true, username: true } },
        component: { select: { id: true, name: true, componentCode: true } },
      },
    });

    return NextResponse.json({ success: true, data: reading }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record measurement';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'work_orders.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const componentIdFilter = searchParams.get('componentId') || undefined;

    // Get all component IDs for this WO
    const woComponents = await db.workOrderComponent.findMany({
      where: { workOrderId: id },
      select: { componentRegistryId: true },
    });

    if (woComponents.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const componentIds = woComponents.map(c => c.componentRegistryId);

    if (componentIdFilter) {
      if (!componentIds.includes(componentIdFilter)) {
        return NextResponse.json({ success: false, error: 'componentId does not belong to this work order' }, { status: 400 });
      }
    }

    const readings = await db.componentConditionReading.findMany({
      where: {
        componentId: componentIdFilter || { in: componentIds },
      },
      orderBy: { recordedAt: 'desc' },
      include: {
        recordedBy: { select: { id: true, fullName: true, username: true } },
        component: { select: { id: true, name: true, componentCode: true } },
      },
      take: 200,
    });

    return NextResponse.json({ success: true, data: readings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch measurements';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
