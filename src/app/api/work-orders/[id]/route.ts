import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/sessions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const wo = await db.workOrder.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, fullName: true } },
        teamMembers: { orderBy: { createdAt: 'asc' } },
        timeLogs: { orderBy: { createdAt: 'desc' } },
        materials: { orderBy: { createdAt: 'desc' } },
        comments: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        request: {
          select: {
            id: true,
            requestNumber: true,
            title: true,
            requester: { select: { id: true, fullName: true, username: true } },
          },
        },
      },
    });

    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: wo });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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
    const { action, reason, ...updateData } = body;

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const now = new Date();
    let updatedWo;

    switch (action) {
      case 'approve': {
        updatedWo = await db.workOrder.update({
          where: { id },
          data: { status: 'approved' },
          include: { creator: { select: { id: true, fullName: true } } },
        });
        await db.wOStatusHistory.create({
          data: { workOrderId: id, fromStatus: wo.status, toStatus: 'approved', changedById: session.userId, reason: reason || 'Work order approved' },
        });
        break;
      }

      case 'assign': {
        const { assignedToId, assignedToName } = body;
        updatedWo = await db.workOrder.update({
          where: { id },
          data: {
            status: 'assigned',
            assignedToId,
            assignedToName,
            assignedById: session.userId,
            assignedAt: now,
            assignmentType: 'direct',
          },
          include: { creator: { select: { id: true, fullName: true } } },
        });
        if (assignedToId) {
          const existing = await db.wOTeamMember.findFirst({ where: { workOrderId: id, userId: assignedToId } });
          if (!existing) {
            await db.wOTeamMember.create({
              data: { workOrderId: id, userId: assignedToId, userName: assignedToName, role: 'leader' },
            });
          } else {
            await db.wOTeamMember.update({ where: { id: existing.id }, data: { role: 'leader' } });
          }
        }
        await db.wOStatusHistory.create({
          data: { workOrderId: id, fromStatus: wo.status, toStatus: 'assigned', changedById: session.userId, reason: reason || `Assigned to ${assignedToName}` },
        });
        break;
      }

      case 'start': {
        updatedWo = await db.workOrder.update({
          where: { id },
          data: {
            status: 'in_progress',
            actualStart: now,
            slaStartedAt: wo.slaStartedAt || now,
          },
          include: { creator: { select: { id: true, fullName: true } } },
        });
        await db.wOTimeLog.create({
          data: { workOrderId: id, userId: session.userId, action: 'start', startTime: now, note: 'Work started' },
        });
        await db.wOStatusHistory.create({
          data: { workOrderId: id, fromStatus: wo.status, toStatus: 'in_progress', changedById: session.userId, reason: reason || 'Work started' },
        });
        break;
      }

      case 'complete': {
        const { completionNotes, failureDescription, causeDescription, actionDescription } = body;
        updatedWo = await db.workOrder.update({
          where: { id },
          data: {
            status: 'completed',
            actualEnd: now,
            failureDescription: failureDescription || wo.failureDescription,
            causeDescription: causeDescription || wo.causeDescription,
            actionDescription: actionDescription || wo.actionDescription,
          },
          include: { creator: { select: { id: true, fullName: true } } },
        });
        if (wo.actualStart) {
          const hours = (now.getTime() - new Date(wo.actualStart).getTime()) / (1000 * 60 * 60);
          await db.workOrder.update({ where: { id }, data: { actualHours: Math.round(hours * 100) / 100 } });
        }
        if (completionNotes) {
          await db.wOComment.create({
            data: { workOrderId: id, userId: session.userId, content: completionNotes },
          });
        }
        await db.wOTimeLog.create({
          data: { workOrderId: id, userId: session.userId, action: 'complete', endTime: now, note: 'Work completed' },
        });
        await db.wOStatusHistory.create({
          data: { workOrderId: id, fromStatus: wo.status, toStatus: 'completed', changedById: session.userId, reason: reason || 'Work completed by technician' },
        });
        break;
      }

      case 'verify': {
        updatedWo = await db.workOrder.update({
          where: { id },
          data: { status: 'verified' },
          include: { creator: { select: { id: true, fullName: true } } },
        });
        await db.wOStatusHistory.create({
          data: { workOrderId: id, fromStatus: wo.status, toStatus: 'verified', changedById: session.userId, reason: reason || 'Work verified by supervisor' },
        });
        break;
      }

      case 'close': {
        updatedWo = await db.workOrder.update({
          where: { id },
          data: { status: 'closed', isLocked: true, lockedBy: session.userId, lockedAt: now, lockReason: 'Work order closed' },
          include: { creator: { select: { id: true, fullName: true } } },
        });
        await db.wOStatusHistory.create({
          data: { workOrderId: id, fromStatus: wo.status, toStatus: 'closed', changedById: session.userId, reason: reason || 'Work order closed' },
        });
        break;
      }

      case 'cancel': {
        updatedWo = await db.workOrder.update({
          where: { id },
          data: { status: 'cancelled' },
          include: { creator: { select: { id: true, fullName: true } } },
        });
        await db.wOStatusHistory.create({
          data: { workOrderId: id, fromStatus: wo.status, toStatus: 'cancelled', changedById: session.userId, reason: reason || 'Work order cancelled' },
        });
        break;
      }

      case 'comment': {
        const { comment } = body;
        if (!comment) {
          return NextResponse.json({ success: false, error: 'Comment required' }, { status: 400 });
        }
        const newComment = await db.wOComment.create({
          data: { workOrderId: id, userId: session.userId, content: comment },
          include: { user: { select: { id: true, fullName: true } } },
        });
        return NextResponse.json({ success: true, data: newComment });
      }

      default: {
        updatedWo = await db.workOrder.update({
          where: { id },
          data: updateData,
          include: { creator: { select: { id: true, fullName: true } } },
        });
      }
    }

    return NextResponse.json({ success: true, data: updatedWo });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
