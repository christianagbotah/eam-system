import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';
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

    // Check permission
    if (!hasAnyPermission(session, ['maintenance_requests.reject', 'maintenance_requests.*'])) {
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

    // Execute status transition via state machine (validates + updates + creates comment with reason)
    const result = await executeTransition(
      'maintenance_request',
      id,
      'rejected',
      session,
      {
        reason,
        extraData: {
          workflowStatus: 'rejected',
          approvedBy: session.userId,
          notes: reason ? `${mr.notes ? mr.notes + ' | ' : ''}Rejected: ${reason}` : mr.notes,
        },
      },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Notify the requester with rejection reason
    if (mr.requestedBy && mr.requestedBy !== session.userId) {
      await notifyUser(
        mr.requestedBy,
        'mr_rejected',
        'Maintenance Request Rejected',
        `Your request ${mr.requestNumber} has been rejected. Reason: ${reason}`,
        'maintenance_request',
        id,
        `mr-detail?id=${id}`,
      );
    }

    // Re-fetch with includes to return full object (state machine returns plain record)
    const updated = await db.maintenanceRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, fullName: true, username: true } },
        supervisor: { select: { id: true, fullName: true, username: true } },
        approver: { select: { id: true, fullName: true, username: true } },
        assignedPlanner: { select: { id: true, fullName: true, username: true } },
        workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reject request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
