import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, isAdmin } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasAnyPermission(session, ['maintenance_requests.update', 'maintenance_requests.assign_planner', 'maintenance_requests.*'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { plannerId } = body;

    if (!plannerId) {
      return NextResponse.json(
        { success: false, error: 'plannerId is required' },
        { status: 400 }
      );
    }

    // Fetch MR with requester department for access control
    const mr = await db.maintenanceRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, fullName: true, username: true, department: true } },
      },
    });
    if (!mr) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    // Access control: only admin or the requester's department supervisor can assign planner
    if (!isAdmin(session)) {
      const currentUser = await db.user.findUnique({
        where: { id: session.userId },
        select: { id: true, department: true, userRoles: { select: { role: { select: { slug: true } } } } },
      });
      const isSupervisor = currentUser?.userRoles.some((r: any) => r.role?.slug === 'maintenance_supervisor' || r.role?.slug === 'admin');
      if (!isSupervisor) {
        return NextResponse.json({ success: false, error: 'Only admin or department supervisor can assign planners' }, { status: 403 });
      }
      const requesterDept = mr.requester?.department;
      const userDept = currentUser?.department;
      const deptMatch = requesterDept && userDept && requesterDept === userDept;
      if (!deptMatch) {
        return NextResponse.json({ success: false, error: 'You can only assign planners for requests from your own department' }, { status: 403 });
      }
    }

    // Verify the planner exists
    const planner = await db.user.findUnique({
      where: { id: plannerId },
      select: { id: true, fullName: true },
    });
    if (!planner) {
      return NextResponse.json({ success: false, error: 'Planner user not found' }, { status: 400 });
    }

    // Update the MR: set planner, change workflow status, change status to approved if not already
    const oldValues = {
      assignedPlannerId: mr.assignedPlannerId,
      workflowStatus: mr.workflowStatus,
      status: mr.status,
    };

    const updatedMr = await db.maintenanceRequest.update({
      where: { id },
      data: {
        assignedPlannerId: plannerId,
        workflowStatus: 'assigned_to_planner',
        // Set status to "approved" if it's not already in a terminal state
        ...(mr.status !== 'approved' && mr.status !== 'rejected' && mr.status !== 'converted'
          ? { status: 'approved' }
          : {}),
      },
      include: {
        requester: { select: { id: true, fullName: true, username: true, department: true } },
        supervisor: { select: { id: true, fullName: true, username: true } },
        approver: { select: { id: true, fullName: true, username: true } },
        assignedPlanner: { select: { id: true, fullName: true, username: true } },
        workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'maintenance_request',
        entityId: id,
        oldValues: JSON.stringify(oldValues),
        newValues: JSON.stringify({
          assignedPlannerId: plannerId,
          workflowStatus: 'assigned_to_planner',
          status: updatedMr.status,
        }),
      },
    });

    // Send notification to the planner
    if (plannerId !== session.userId) {
      await notifyUser(
        plannerId,
        'mr_assigned',
        'Maintenance Request Assigned for Planning',
        `Maintenance request ${mr.requestNumber} has been assigned to you for planning: ${mr.title}`,
        'maintenance_request',
        id,
        `mr-detail?id=${id}`,
      );
    }

    return NextResponse.json({ success: true, data: updatedMr });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to assign planner';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
