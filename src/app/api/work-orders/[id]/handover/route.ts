import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPlantScope, canAccessPlant } from '@/lib/plant-scope';
import { initiateHandover, resumeAfterHandover } from '@/services/workExecution.service';
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

    // Plant scope check (denyAccess + canAccessPlant)
    const wo = await (await import('@/lib/db')).db.workOrder.findUnique({
      where: { id }, select: { id: true, plantId: true },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlant(plantScope, wo.plantId)) {
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
      const result = await resumeAfterHandover(id, sessionCtx, {
        reason: body.reason,
        idempotencyKey: body.idempotencyKey,
      });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: result.readiness ? 422 : 400 });
      }
      return NextResponse.json({ success: true, data: result.data });
    }

    // Default: initiate handover (atomic: close timers + transition WO + create ShiftHandover + audit)
    const result = await initiateHandover(id, sessionCtx, {
      reason: body.reason,
      idempotencyKey: body.idempotencyKey,
      shiftType: body.shiftType,
      shiftDate: body.shiftDate,
      fromShift: body.fromShift,
      toShift: body.toShift,
      receivedById: body.receivedById,
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
