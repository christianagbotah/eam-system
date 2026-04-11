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

    // Check permission
    if (!hasAnyPermission(session, ['maintenance_requests.approve', 'maintenance_requests.*'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const mr = await db.maintenanceRequest.findUnique({ where: { id } });
    if (!mr) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    // Validate status transition
    const transition = await db.statusTransition.findFirst({
      where: {
        entityType: 'maintenance_request',
        fromStatus: mr.status,
        toStatus: 'rejected',
      },
    });

    if (transition) {
      const allowedRoles: string[] = JSON.parse(transition.allowedRoleSlugs);
      const hasRole = session.roles.some((r) => allowedRoles.includes(r));
      if (!hasRole) {
        return NextResponse.json(
          { success: false, error: 'Your role is not allowed to perform this action' },
          { status: 403 }
        );
      }

      if (transition.requiresReason && !reason) {
        return NextResponse.json(
          { success: false, error: 'This transition requires a reason' },
          { status: 400 }
        );
      }
    } else if (!session.roles.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'No valid status transition defined for this action' },
        { status: 400 }
      );
    }

    // Update the request
    const updated = await db.maintenanceRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        workflowStatus: 'rejected',
        approvedBy: session.userId,
        notes: reason ? `${mr.notes ? mr.notes + ' | ' : ''}Rejected: ${reason}` : mr.notes,
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
        newValues: JSON.stringify({ status: 'rejected', reason }),
      },
    });

    // Notify the requester
    if (mr.requestedBy && mr.requestedBy !== session.userId) {
      await notifyUser(
        mr.requestedBy,
        'mr_rejected',
        'Maintenance Request Rejected',
        `Your request ${mr.requestNumber} has been rejected`,
        'maintenance_request',
        id,
        `mr-detail?id=${id}`,
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reject request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
