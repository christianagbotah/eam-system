import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { getPlantScope, applyPlantScope } from '@/lib/plant-scope';
import { notifyUser, notifyAdmins } from '@/lib/notifications';

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
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'maintenance_requests.view') && !hasPermission(session, 'maintenance_requests.view_own') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }
    const hasViewAll = hasPermission(session, 'maintenance_requests.view') || hasPermission(session, 'maintenance_requests.view_all') || isAdmin(session);

    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search');

    // Resolve plant scope (validates X-Plant-ID against user's plant access)
    const plantScope = await getPlantScope(request, session);

    // Build where clause with role-based filtering
    const where: Record<string, unknown> = {};
    if (status) {
      // Support comma-separated status values (e.g. "pending,approved")
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
    }
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (search) {
      where.title = { contains: search };
    }

    // Users with only view_own should only see their own requests
    if (!hasViewAll) {
      where.requestedBy = session.userId;
    } else if (!isAdmin(session)) {
      if (session.roles.includes('maintenance_supervisor')) {
        // Supervisors see MRs from departments where they are the supervisor
        // OR MRs explicitly assigned to them (backward compatibility)
        const supervisedDepts = await db.department.findMany({
          where: { supervisorId: session.userId },
          select: { id: true },
        });
        const supervisedDeptIds = supervisedDepts.map(d => d.id);
        if (supervisedDeptIds.length > 0) {
          where.OR = [
            { supervisorId: session.userId },
            { departmentId: { in: supervisedDeptIds } },
          ];
        } else {
          // No supervised departments — fall back to explicitly assigned only
          where.supervisorId = session.userId;
        }
      } else if (session.roles.includes('maintenance_technician')) {
        // Technicians see WOs linked to them via maintenance requests
        where.OR = [
          { requestedBy: session.userId },
          { workOrder: { assignedTo: session.userId } },
        ];
      }
      // Planners, admins, and users with view_all see everything
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
      assetName,
      location,
      departmentId,
      plantId,
      machineDownStatus,
      supervisorId: explicitSupervisorId,
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
    // Fallback: if still null, try any single plant
    if (!resolvedPlantId && !isAdmin(session)) {
      const anyPlant = await db.userPlant.findFirst({
        where: { userId: session.userId },
        select: { plantId: true },
      });
      if (anyPlant) resolvedPlantId = anyPlant.plantId;
    }
    // Null-plant guard for operational records
    if (!resolvedPlantId && !isAdmin(session)) {
      return NextResponse.json(
        { success: false, error: 'Plant selection required. You must specify a plant for maintenance requests.' },
        { status: 400 },
      );
    }

    // Use explicitly provided supervisorId, or auto-detect from department
    let resolvedSupervisorId = explicitSupervisorId || null;
    const resolvedDepartmentId = departmentId || null;
    if (!resolvedSupervisorId && resolvedDepartmentId) {
      const department = await db.department.findUnique({
        where: { id: resolvedDepartmentId },
        select: { supervisorId: true },
      });
      if (department?.supervisorId) {
        resolvedSupervisorId = department.supervisorId;
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
        assetName: assetName || null,
        location: location || null,
        departmentId: resolvedDepartmentId,
        plantId: resolvedPlantId,
        requestedBy: session.userId,
        supervisorId: resolvedSupervisorId,
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

    // Send notification to the auto-detected supervisor with full details
    if (resolvedSupervisorId && resolvedSupervisorId !== session.userId) {
      const desc = description ? description.substring(0, 120) : '';
      const assetInfo = assetName || '';
      const priorityLabel = (priority || 'medium').toUpperCase();
      await notifyUser(
        resolvedSupervisorId,
        'mr_assigned',
        `New MR: ${mr.requestNumber} [${priorityLabel}]`,
        `"${mr.title}"${assetInfo ? ` — ${assetInfo}` : ''}\nSubmitted by ${mr.requester?.fullName || 'Unknown'}${desc ? `\n${desc}` : ''}`,
        'maintenance_request',
        mr.id,
        `mr-detail?id=${mr.id}`,
        { forceSms: true },
      );
    }

    // Also notify all admins about the new maintenance request
    await notifyAdmins(
      'mr_assigned',
      `New MR: ${mr.requestNumber}`,
      `"${mr.title}" submitted by ${mr.requester?.fullName || 'Unknown'}${description ? `\n${description.substring(0, 100)}` : ''}`,
      'maintenance_request',
      mr.id,
      `mr-detail?id=${mr.id}`,
      { forceSms: true },
    );

    return NextResponse.json({ success: true, data: mr }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create maintenance request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
