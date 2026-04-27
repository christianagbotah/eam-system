import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, isAdmin } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import { executeTransition } from '@/lib/state-machine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Check permission: maintenance_requests.approve or admin role
    if (!hasAnyPermission(session, ['maintenance_requests.approve', 'maintenance_requests.*'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

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

    // Access control: only admin or the requester's department supervisor can approve
    if (!isAdmin(session)) {
      const currentUser = await db.user.findUnique({
        where: { id: session.userId },
        select: { id: true, department: true, userRoles: { select: { role: { select: { slug: true } } } } },
      });
      const isSupervisor = currentUser?.userRoles.some((r: any) => r.role?.slug === 'maintenance_supervisor' || r.role?.slug === 'admin');
      if (!isSupervisor) {
        return NextResponse.json({ success: false, error: 'Only admin or department supervisor can approve requests' }, { status: 403 });
      }
      const requesterDept = mr.requester?.department;
      const userDept = currentUser?.department;
      const deptMatch = requesterDept && userDept && requesterDept === userDept;
      if (!deptMatch) {
        return NextResponse.json({ success: false, error: 'You can only approve requests from your own department' }, { status: 403 });
      }
    }

    // Execute status transition via state machine (validates + updates + creates comment)
    const result = await executeTransition(
      'maintenance_request',
      id,
      'approved',
      session,
      {
        extraData: {
          workflowStatus: 'approved',
          approvedBy: session.userId,
          notes: notes || mr.notes,
        },
      },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Notify the requester
    if (mr.requestedBy && mr.requestedBy !== session.userId) {
      await notifyUser(
        mr.requestedBy,
        'mr_approved',
        'Maintenance Request Approved',
        `Your request ${mr.requestNumber} has been approved`,
        'maintenance_request',
        id,
        `mr-detail?id=${id}`,
      );
    }

    // Re-fetch with includes to return full object (state machine returns plain record)
    const updated = await db.maintenanceRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, fullName: true, username: true, department: true } },
        supervisor: { select: { id: true, fullName: true, username: true } },
        approver: { select: { id: true, fullName: true, username: true } },
        assignedPlanner: { select: { id: true, fullName: true, username: true } },
        workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to approve request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
