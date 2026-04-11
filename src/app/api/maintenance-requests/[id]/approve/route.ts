import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';
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

    // Check permission: maintenance_requests.approve or admin role
    if (!hasAnyPermission(session, ['maintenance_requests.approve', 'maintenance_requests.*'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

    const mr = await db.maintenanceRequest.findUnique({ where: { id } });
    if (!mr) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    // Validate status transition using StatusTransition table
    const transition = await db.statusTransition.findFirst({
      where: {
        entityType: 'maintenance_request',
        fromStatus: mr.status,
        toStatus: 'approved',
      },
    });

    if (transition) {
      // Parse allowed roles
      const allowedRoles: string[] = JSON.parse(transition.allowedRoleSlugs);
      const hasRole = session.roles.some((r) => allowedRoles.includes(r));
      if (!hasRole) {
        return NextResponse.json(
          { success: false, error: 'Your role is not allowed to perform this action' },
          { status: 403 }
        );
      }
    } else if (!session.roles.includes('admin')) {
      // If no transition defined, only admin can approve
      return NextResponse.json(
        { success: false, error: 'No valid status transition defined for this action' },
        { status: 400 }
      );
    }

    // Update the request
    const updated = await db.maintenanceRequest.update({
      where: { id },
      data: {
        status: 'approved',
        workflowStatus: 'approved',
        approvedBy: session.userId,
        notes: notes || mr.notes,
      },
      include: {
        requester: { select: { id: true, fullName: true, username: true } },
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
        oldValues: JSON.stringify({ status: mr.status }),
        newValues: JSON.stringify({ status: 'approved' }),
      },
    });

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

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to approve request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
