import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { executeTransition } from '@/lib/state-machine';
import { notifyUser } from '@/lib/notifications';
import { checkReadiness } from '@/services/workOrderReadiness.service';

/**
 * POST /api/work-orders/[id]/verify
 *
 * Verifies a completed work order (completed → verified).
 * Also supports rework action (completed → in_progress with rework counter).
 * Typically done by a supervisor to confirm work quality.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'work_orders.verify') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { notes, qualityRating, verifiedBy } = body;
    const isRework = body.action === 'rework';

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // ── P2N: Rework action requires a reason ──
    if (isRework && !body.reason) {
      return NextResponse.json({ success: false, error: 'Rework reason is required' }, { status: 400 });
    }

    // ── P2N: Readiness check before verification (not needed for rework) ──
    if (!isRework) {
      const readiness = await checkReadiness(id, 'verify');
      if (!readiness.ready) {
        return NextResponse.json({
          success: false,
          error: 'Work order is not ready for verification',
          blockers: readiness.blockers,
        }, { status: 422 });
      }
    }

    // ── P2N: Rework counter increment (P2N-6) ──
    if (isRework) {
      await db.repairCompletion.upsert({
        where: { workOrderId: id },
        update: { reworkCount: { increment: 1 }, reworkReason: body.reason },
        create: { workOrderId: id, reworkCount: 1, reworkReason: body.reason },
      });
    }

    const targetStatus = isRework ? 'in_progress' : 'verified';
    const result = await executeTransition(
      'work_order',
      id,
      targetStatus,
      session,
      { reason: isRework ? body.reason : notes },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // ── Rework path: comment + notify + return ──
    if (isRework) {
      await db.workOrderComment.create({
        data: {
          workOrderId: id,
          userId: session.userId,
          content: `[Rework] ${body.reason}`,
        },
      });

      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: 'update',
          entityType: 'work_order',
          entityId: id,
          newValues: JSON.stringify({ status: 'in_progress', reworkReason: body.reason }),
        },
      });

      if (wo.assignedTo && wo.assignedTo !== session.userId) {
        await notifyUser(
          wo.assignedTo,
          'wo_rework',
          'Rework Required',
          `${session.fullName} requested rework on ${wo.woNumber}: "${body.reason}"`,
          'work_order',
          id,
          `wo-detail?id=${id}`,
          { forceSms: true },
        );
      }

      const updated = await db.workOrder.findUnique({
        where: { id },
        include: {
          assignee: { select: { id: true, fullName: true, username: true } },
          teamLeader: { select: { id: true, fullName: true, username: true } },
          assignedSupervisor: { select: { id: true, fullName: true, username: true } },
          maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
        },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // ── Verification path ──
    // Add verification comment
    const commentContent = notes
      ? `[Verification] ${notes}${qualityRating ? ` | Quality Rating: ${qualityRating}/5` : ''}`
      : `[Verification] Verified by ${session.fullName}`;
    await db.workOrderComment.create({
      data: {
        workOrderId: id,
        userId: session.userId,
        content: commentContent,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'work_order',
        entityId: id,
        newValues: JSON.stringify({
          status: 'verified',
          verifiedBy: session.userId,
          qualityRating: qualityRating ?? null,
        }),
      },
    });

    // Notify planner that WO has been verified and is ready for final action/closure
    if (wo.plannerId && wo.plannerId !== session.userId) {
      await notifyUser(
        wo.plannerId,
        'wo_completed',
        'Work Order Verified — Ready for Closure',
        `WO ${wo.woNumber} has been verified by ${session.fullName} and is ready for your final action/closure.`,
        'work_order',
        id,
        `wo-detail?id=${id}`,
        { forceSms: true },
      );
    }

    // Also notify the assigned technician that work has been verified
    if (wo.assignedTo && wo.assignedTo !== session.userId && wo.assignedTo !== wo.plannerId) {
      await notifyUser(
        wo.assignedTo,
        'wo_completed',
        'Work Order Verified',
        `Your work on ${wo.woNumber} has been verified and approved.`,
        'work_order',
        id,
        `wo-detail?id=${id}`,
      );
    }

    // Re-fetch with includes
    const updated = await db.workOrder.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
