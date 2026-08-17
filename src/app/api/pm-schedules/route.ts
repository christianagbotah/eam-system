import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { getPlantScope, canAccessPlant } from '@/lib/plant-scope';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');
    const isActive = searchParams.get('isActive');
    const dueSoon = searchParams.get('dueSoon');

    // Resolve plant scope (validates X-Plant-ID against user's plant access)
    // PmSchedule has no direct plantId — scope through the related Asset's plantId
    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const where: Record<string, unknown> = {};

    if (assetId) where.assetId = assetId;
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    if (dueSoon === 'true') {
      // Schedules due within the next 7 days
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.nextDueDate = { lte: weekFromNow };
    }

    // ALWAYS apply plant scoping via nested Asset relation filter
    if (!plantScope.isSystemWide) {
      if (plantScope.plantId) {
        where.asset = { plantId: plantScope.plantId };
      } else if (plantScope.accessiblePlantIds.length > 0) {
        where.asset = { plantId: { in: plantScope.accessiblePlantIds } };
      } else {
        where.asset = { plantId: '__ACCESS_DENIED__' };
      }
    }

    const schedules = await db.pmSchedule.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        asset: {
          select: { id: true, name: true, assetTag: true, status: true },
        },
        assignedTo: { select: { id: true, fullName: true, username: true } },
        department: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
        template: { select: { id: true, title: true, type: true, _count: { select: { tasks: true } } } },
      },
      orderBy: { nextDueDate: 'asc' },
    });

    return NextResponse.json({ success: true, data: schedules });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load PM schedules';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      assetId,
      frequencyType,
      frequencyValue,
      lastCompletedDate,
      nextDueDate,
      estimatedDuration,
      priority,
      assignedToId,
      departmentId,
      autoGenerateWO,
      leadDays,
    } = body;

    if (!title || !assetId) {
      return NextResponse.json(
        { success: false, error: 'Title and asset are required' },
        { status: 400 }
      );
    }

    if (!frequencyType || !frequencyValue) {
      return NextResponse.json(
        { success: false, error: 'Frequency type and value are required' },
        { status: 400 }
      );
    }

    // Validate asset exists and user has plant access to it
    const assetExists = await db.asset.findUnique({ where: { id: assetId }, select: { id: true, plantId: true } });
    if (!assetExists) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 400 });
    }
    const postScope = await getPlantScope(request, session);
    if (postScope.denyAccess || !canAccessPlant(postScope, assetExists.plantId)) {
      return NextResponse.json({ success: false, error: 'Cannot create PM schedule for an asset in an inaccessible plant' }, { status: 403 });
    }

    const schedule = await db.pmSchedule.create({
      data: {
        title,
        description: description || null,
        assetId,
        frequencyType,
        frequencyValue,
        lastCompletedDate: lastCompletedDate ? new Date(lastCompletedDate) : null,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        estimatedDuration: estimatedDuration || null,
        priority: priority || 'medium',
        assignedToId: assignedToId || null,
        departmentId: departmentId || null,
        autoGenerateWO: autoGenerateWO !== undefined ? autoGenerateWO : true,
        leadDays: leadDays || 3,
        createdById: session.userId,
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true, status: true } },
        assignedTo: { select: { id: true, fullName: true, username: true } },
        department: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'pm_schedule',
        entityId: schedule.id,
        newValues: JSON.stringify({ title, assetId, frequencyType, frequencyValue }),
      },
    });

    return NextResponse.json({ success: true, data: schedule }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create PM schedule';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
