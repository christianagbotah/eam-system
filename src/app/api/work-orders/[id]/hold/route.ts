import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import {
  placeWorkOrderInWaitingState,
  type ExecutionStateSessionContext,
  type ExecutionStateAuditContext,
} from '@/services/workOrderExecutionState.service';
import { extractAuditContext } from '@/lib/audit-helpers';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const auth = await authorizeWorkOrderPlant(request, session, id);
    if (!auth.ok) return auth.response;

    if (!hasPermission(session, 'work_orders.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'A reason is required to place a work order on hold' },
        { status: 400 },
      );
    }

    const auditCtx = extractAuditContext(request);
    const result = await placeWorkOrderInWaitingState(
      id,
      'on_hold',
      session as ExecutionStateSessionContext,
      {
        reason,
        requireExecutionAuthority: true,
        auditCtx: auditCtx as ExecutionStateAuditContext,
      },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to put work order on hold';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
