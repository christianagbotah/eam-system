import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions } from '../auth/login/route';

function getSession(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  return token ? sessions.get(token) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mr = await db.maintenanceRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, fullName: true, username: true } },
        reviewer: { select: { id: true, fullName: true, username: true } },
        workOrder: { select: { id: true, woNumber, title, status } },
        comments: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!mr) {
      return NextResponse.json({ success: false, error: 'Maintenance request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: mr });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Approve a maintenance request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, reviewNotes, woTitle, woDescription, woPriority, woAssignedToId, woAssignedToName, woEstimatedHours, woPlannedStart } = body;

    const mr = await db.maintenanceRequest.findUnique({ where: { id } });
    if (!mr) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    let updatedMr;
    const now = new Date();

    if (action === 'approve') {
      updatedMr = await db.maintenanceRequest.update({
        where: { id },
        data: {
          status: 'approved',
          workflowStatus: 'approved',
          approvedById: session.userId,
          approvedAt: now,
          reviewNotes,
        },
        include: {
          requester: { select: { id: true, fullName: true, username: true } },
          reviewer: { select: { id: true, fullName: true, username: true } },
        },
      });

      await db.mRStatusHistory.create({
        data: {
          maintenanceRequestId: id,
          fromStatus: mr.status,
          toStatus: 'approved',
          changedById: session.userId,
          reason: reviewNotes || 'Request approved',
        },
      });
    } else if (action === 'reject') {
      updatedMr = await db.maintenanceRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          workflowStatus: 'rejected',
          approvedById: session.userId,
          approvedAt: now,
          reviewNotes,
        },
        include: {
          requester: { select: { id: true, fullName: true, username: true } },
          reviewer: { select: { id: true, fullName: true, username: true } },
        },
      });

      await db.mRStatusHistory.create({
        data: {
          maintenanceRequestId: id,
          fromStatus: mr.status,
          toStatus: 'rejected',
          changedById: session.userId,
          reason: reviewNotes || 'Request rejected',
        },
      });
    } else if (action === 'convert') {
      // Convert to Work Order
      const woCount = await db.workOrder.count();
      const woNumber = `WO-${new Date().getFullYear()}-${String(woCount + 1).padStart(3, '0')}`;

      const wo = await db.workOrder.create({
        data: {
          woNumber,
          title: woTitle || mr.title,
          description: woDescription || mr.description,
          type: 'corrective',
          priority: woPriority || mr.priority,
          status: 'draft',
          assetName: mr.assetName,
          requestId: mr.id,
          createdById: session.userId,
          estimatedHours: woEstimatedHours,
          plannedStart: woPlannedStart,
        },
      });

      updatedMr = await db.maintenanceRequest.update({
        where: { id },
        data: {
          status: 'converted',
          workflowStatus: 'work_order_created',
          workOrderId: wo.id,
          plannerId: session.userId,
        },
        include: {
          requester: { select: { id: true, fullName: true, username: true } },
          reviewer: { select: { id: true, fullName: true, username: true } },
          workOrder: { select: { id: true, woNumber, title, status } },
        },
      });

      await db.mRStatusHistory.create({
        data: {
          maintenanceRequestId: id,
          fromStatus: mr.status,
          toStatus: 'converted',
          changedById: session.userId,
          reason: `Converted to Work Order ${woNumber}`,
        },
      });

      await db.woStatusHistory.create({
        data: {
          workOrderId: wo.id,
          toStatus: 'draft',
          changedById: session.userId,
          reason: `Created from Maintenance Request ${mr.requestNumber}`,
        },
      });

      return NextResponse.json({ success: true, data: updatedMr });
    } else if (action === 'comment') {
      const { comment } = body;
      if (!comment) {
        return NextResponse.json({ success: false, error: 'Comment content required' }, { status: 400 });
      }

      const newComment = await db.mRComment.create({
        data: {
          maintenanceRequestId: id,
          userId: session.userId,
          content: comment,
        },
        include: { user: { select: { id: true, fullName: true } } },
      });

      return NextResponse.json({ success: true, data: newComment });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: updatedMr });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
