import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';
import { getPlantScope, applyPlantScope } from '@/lib/plant-scope';

// Helper: generate WO number WO-YYYYMM-NNNN
async function generateWoNumber(): Promise<string> {
  const now = new Date();
  const prefix = `WO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.workOrder.findFirst({
    where: { woNumber: { startsWith: prefix } },
    orderBy: { woNumber: 'desc' },
    select: { woNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.woNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');
    const assignedTo = searchParams.get('assignedTo');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search');

    // Resolve plant scope (validates X-Plant-ID against user's plant access)
    const plantScope = session ? await getPlantScope(request, session) : null;

    // Build where clause with role-based filtering
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (search) {
      where.title = { contains: search };
    }

    if (session) {
      if (!isAdmin(session)) {
        if (session.roles.includes('maintenance_technician')) {
          // Technicians see WOs assigned to them
          where.assignedTo = session.userId;
        }
        // Planners and supervisors see all
      }
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    // Apply plant scoping filter
    if (plantScope) {
      applyPlantScope(where, plantScope);
    }

    const [workOrders, total] = await Promise.all([
      db.workOrder.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          assignee: { select: { id: true, fullName: true, username: true } },
          teamLeader: { select: { id: true, fullName: true, username: true } },
          assignedSupervisor: { select: { id: true, fullName: true, username: true } },
          assigner: { select: { id: true, fullName: true, username: true } },
          planner: { select: { id: true, fullName: true, username: true } },
          maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
          pmSchedule: { select: { id: true, title: true, frequencyType: true, frequencyValue: true } },
          teamMembers: {
            include: { user: { select: { id: true, fullName: true } } },
            orderBy: { assignedAt: 'asc' },
          },
          timeLogs: {
            include: {
              user: { select: { id: true, fullName: true, username: true } },
            },
            orderBy: { timestamp: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.workOrder.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: workOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load work orders';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      type,
      priority,
      assetId,
      assetName,
      departmentId,
      plantId,
      estimatedHours,
      plannedStart,
      plannedEnd,
      maintenanceRequestId,
      notes,
      failureDescription,
      causeDescription,
      actionDescription,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const woNumber = await generateWoNumber();

    // Resolve plantId
    let resolvedPlantId = plantId;
    if (!resolvedPlantId) {
      const userPlant = await db.userPlant.findFirst({
        where: { userId: session.userId, isPrimary: true },
      });
      resolvedPlantId = userPlant?.plantId ?? null;
    }

    const wo = await db.workOrder.create({
      data: {
        woNumber,
        title,
        description: description || null,
        type: type || 'corrective',
        priority: priority || 'medium',
        assetId: assetId || null,
        assetName: assetName || null,
        departmentId: departmentId || null,
        plantId: resolvedPlantId,
        estimatedHours: estimatedHours || null,
        plannedStart: plannedStart ? new Date(plannedStart) : null,
        plannedEnd: plannedEnd ? new Date(plannedEnd) : null,
        maintenanceRequestId: maintenanceRequestId || null,
        notes: notes || null,
        failureDescription: failureDescription || null,
        causeDescription: causeDescription || null,
        actionDescription: actionDescription || null,
      },
      include: {
        assignee: { select: { id: true, fullName: true } },
        planner: { select: { id: true, fullName: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

    // If created from a maintenance request, update the MR status
    if (maintenanceRequestId) {
      await db.maintenanceRequest.update({
        where: { id: maintenanceRequestId },
        data: {
          status: 'converted',
          workflowStatus: 'work_order_created',
          assignedPlannerId: session.userId,
        },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'work_order',
        entityId: wo.id,
        newValues: JSON.stringify({ woNumber, title, type, priority }),
      },
    });

    return NextResponse.json({ success: true, data: wo }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
