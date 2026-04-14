import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { getPlantScope, applyPlantScope } from '@/lib/plant-scope';
import { notifyUser } from '@/lib/notifications';

// Helper: generate request number MR-YYYYMM-NNNN
async function generateRequestNumber(): Promise<string> {
  const now = new Date();
  const prefix = `MR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Find the latest MR with the same prefix
  const latest = await db.maintenanceRequest.findFirst({
    where: { requestNumber: { startsWith: prefix } },
    orderBy: { requestNumber: 'desc' },
    select: { requestNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.requestNumber.split('-');
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
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search');

    // Resolve plant scope (validates X-Plant-ID against user's plant access)
    const plantScope = session ? await getPlantScope(request, session) : null;

    // Build where clause with role-based filtering
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (search) {
      where.title = { contains: search };
    }

    if (session) {
      if (!isAdmin(session)) {
        if (session.roles.includes('production_operator')) {
          // Operators see their own requests
          where.requestedBy = session.userId;
        } else if (session.roles.includes('maintenance_supervisor')) {
          // Supervisors see their department's requests
          where.supervisorId = session.userId;
        }
        // Planners and admins see all
      }
    }

    // Apply plant scoping filter
    if (plantScope) {
      applyPlantScope(where, plantScope);
    }

    const [requests, total] = await Promise.all([
      db.maintenanceRequest.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          asset: { select: { id: true, name: true, assetTag: true, serialNumber: true } },
          requester: { select: { id: true, fullName: true, username: true } },
          supervisor: { select: { id: true, fullName: true, username: true } },
          approver: { select: { id: true, fullName: true, username: true } },
          assignedPlanner: { select: { id: true, fullName: true, username: true } },
          workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.maintenanceRequest.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load maintenance requests';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'maintenance_requests.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      priority,
      category,
      assetId,
      departmentId,
      plantId,
      machineDownStatus,
      estimatedHours,
      slaHours,
      plannedStart,
      plannedEnd,
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const requestNumber = await generateRequestNumber();

    // Get user's primary plant if not provided
    let resolvedPlantId = plantId;
    if (!resolvedPlantId) {
      const userPlant = await db.userPlant.findFirst({
        where: { userId: session.userId, isPrimary: true },
      });
      resolvedPlantId = userPlant?.plantId ?? null;
    }

    // Auto-detect the worker's department supervisor
    let autoSupervisorId: string | null = null;
    const resolvedDepartmentId = departmentId || null;
    if (resolvedDepartmentId) {
      const department = await db.department.findUnique({
        where: { id: resolvedDepartmentId },
        select: { supervisorId: true },
      });
      if (department?.supervisorId) {
        autoSupervisorId = department.supervisorId;
      }
    }

    const mr = await db.maintenanceRequest.create({
      data: {
        requestNumber,
        title,
        description: description || null,
        priority: priority || 'medium',
        category: category || null,
        assetId: assetId || null,
        departmentId: resolvedDepartmentId,
        plantId: resolvedPlantId,
        requestedBy: session.userId,
        supervisorId: autoSupervisorId,
        machineDownStatus: machineDownStatus || false,
        estimatedHours: estimatedHours || null,
        slaHours: slaHours || null,
        plannedStart: plannedStart ? new Date(plannedStart) : null,
        plannedEnd: plannedEnd ? new Date(plannedEnd) : null,
        notes: notes || null,
      },
      include: {
        requester: { select: { id: true, fullName: true, username: true } },
        supervisor: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Send notification to the auto-detected supervisor
    if (autoSupervisorId && autoSupervisorId !== session.userId) {
      await notifyUser(
        autoSupervisorId,
        'mr_assigned',
        'New Maintenance Request Pending Review',
        `A new maintenance request ${mr.requestNumber} has been submitted for your review: ${mr.title}`,
        'maintenance_request',
        mr.id,
        `mr-detail?id=${mr.id}`,
      );
    }

    return NextResponse.json({ success: true, data: mr }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create maintenance request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
