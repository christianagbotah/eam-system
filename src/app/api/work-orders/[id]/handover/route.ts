import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
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
      where: { id },
      select: { id: true, plantId: true, assignedTo: true, teamMembers: { select: { userId: true } } },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlant(plantScope, wo.plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Authorization for initiate handover: permission OR assigned role
    if (action !== 'resume') {
      const hasShiftPerm = hasPermission(session, 'shift_handovers.create');
      const isAssignee = session.userId === wo.assignedTo;
      const isTeamMember = wo.teamMembers?.some((m) => m.userId === session.userId) ?? false;
      const isUserAdmin = isAdmin(session);

      if (!hasShiftPerm && !isAssignee && !isTeamMember && !isUserAdmin) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions to initiate a shift handover' },
          { status: 403 },
        );
      }
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

    // Default: initiate handover
    const result = await initiateHandover(id, sessionCtx, {
      reason: body.reason,
      idempotencyKey: body.idempotencyKey,
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
