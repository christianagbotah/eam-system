import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPlantScope, canAccessPlantStrict } from '@/lib/plant-scope';
import { initiateHandover } from '@/services/workExecution.service';
import { resumeConfirmedHandover } from '@/services/repairHandoverResume.service';
import type { SessionContext } from '@/services/workExecution.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action as string | undefined;

    const wo = await db.workOrder.findUnique({
      where: { id },
      select: { id: true, plantId: true, status: true },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlantStrict(plantScope, wo.plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const sessionCtx: SessionContext = {
      userId: session.userId,
      fullName: session.fullName,
      roles: session.roles || [],
      permissions: session.permissions || [],
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    if (action === 'resume') {
      const result = await resumeConfirmedHandover(id, sessionCtx, {
        reason: body.reason,
      });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: result.data });
    }

    // Handover initiation must designate a real incoming worker.
    const receivedById = typeof body.receivedById === 'string' ? body.receivedById.trim() : '';
    if (!receivedById) {
      return NextResponse.json({ success: false, error: 'receivedById is required for shift handover' }, { status: 400 });
    }
    if (receivedById === session.userId) {
      return NextResponse.json({ success: false, error: 'Handover receiver must be different from the outgoing worker' }, { status: 400 });
    }
    if (!wo.plantId) {
      return NextResponse.json({ success: false, error: 'Operational work order must have a plant before handover' }, { status: 400 });
    }

    const receiver = await db.user.findUnique({
      where: { id: receivedById },
      select: { id: true, status: true },
    });
    if (!receiver || receiver.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Designated handover receiver is not an active user' }, { status: 400 });
    }

    const receiverPlant = await db.userPlant.findFirst({
      where: { userId: receivedById, plantId: wo.plantId },
      select: { id: true },
    });
    if (!receiverPlant) {
      return NextResponse.json({ success: false, error: 'Designated handover receiver does not have access to this plant' }, { status: 400 });
    }

    // Default: initiate handover (atomic in canonical service: close timers +
    // transition WO + create ShiftHandover + audit).
    const result = await initiateHandover(id, sessionCtx, {
      reason: body.reason,
      idempotencyKey: body.idempotencyKey,
      shiftType: body.shiftType,
      shiftDate: body.shiftDate,
      fromShift: body.fromShift,
      toShift: body.toShift,
      receivedById,
      tasksSummary: body.tasksSummary,
      pendingIssues: body.pendingIssues,
      safetyNotes: body.safetyNotes,
      equipmentStatus: body.equipmentStatus,
      notes: body.notes,
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Handover operation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
