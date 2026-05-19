import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { getPlantScope, applyPlantScope } from '@/lib/plant-scope';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get('plantId');
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assigneeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search');

    const plantScope = await getPlantScope(request, session);

    const where: Record<string, unknown> = {};

    if (plantId) where.plantId = plantId;
    if (status) where.status = status;
    if (assigneeId) where.assignedToId = assigneeId;
    if (search) {
      where.name = { contains: search };
    }
    if (startDate && endDate) {
      where.scheduledDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.scheduledDate = { gte: new Date(startDate) };
    } else if (endDate) {
      where.scheduledDate = { lte: new Date(endDate) };
    }

    if (plantScope) {
      applyPlantScope(where, plantScope);
    }

    const [workPackages, total] = await Promise.all([
      db.workPackage.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          assignee: { select: { id: true, fullName: true, username: true } },
          plant: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, fullName: true, username: true } },
          workOrders: {
            select: {
              id: true,
              woNumber: true,
              title: true,
              status: true,
              priority: true,
              estimatedHours: true,
              actualHours: true,
            },
          },
          _count: {
            select: { workOrders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.workPackage.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: workPackages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load work packages';
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
      name,
      description,
      plantId,
      assignedToId,
      scheduledDate,
      shift,
      workOrderIds,
      notes,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Package name is required' }, { status: 400 });
    }

    if (!workOrderIds || !Array.isArray(workOrderIds) || workOrderIds.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one work order is required' }, { status: 400 });
    }

    // Validate that all WOs exist
    const existingWOs = await db.workOrder.findMany({
      where: { id: { in: workOrderIds } },
      select: { id: true, estimatedHours: true, workPackageId: true },
    });

    if (existingWOs.length !== workOrderIds.length) {
      return NextResponse.json({ success: false, error: 'One or more work orders not found' }, { status: 400 });
    }

    // Check that WOs are not already assigned to another package
    const alreadyAssigned = existingWOs.filter(wo => wo.workPackageId && wo.workPackageId !== null);
    if (alreadyAssigned.length > 0) {
      return NextResponse.json({ success: false, error: `${alreadyAssigned.length} work order(s) already belong to another work package` }, { status: 400 });
    }

    const totalEstimatedHours = existingWOs.reduce((sum, wo) => sum + (wo.estimatedHours || 0), 0);

    // Resolve plantId if not provided
    let resolvedPlantId = plantId;
    if (!resolvedPlantId) {
      const userPlant = await db.userPlant.findFirst({
        where: { userId: session.userId, isPrimary: true },
      });
      resolvedPlantId = userPlant?.plantId ?? null;
    }

    const workPackage = await db.workPackage.create({
      data: {
        name: name.trim(),
        description: description || null,
        plantId: resolvedPlantId,
        assignedToId: assignedToId || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        shift: shift || null,
        totalEstimatedHours,
        notes: notes || null,
        createdById: session.userId,
        workOrders: {
          connect: workOrderIds.map((id: string) => ({ id })),
        },
      },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        plant: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
        workOrders: {
          select: {
            id: true,
            woNumber: true,
            title: true,
            status: true,
            priority: true,
            estimatedHours: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'work_package',
        entityId: workPackage.id,
        oldValues: null,
        newValues: JSON.stringify({
          name: workPackage.name,
          workOrderCount: workOrderIds.length,
          assignedToId,
          scheduledDate,
          shift,
        }),
      },
    });

    return NextResponse.json({ success: true, data: workPackage }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create work package';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
