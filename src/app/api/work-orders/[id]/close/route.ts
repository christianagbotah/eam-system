import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPermission } from '@/lib/auth';
import {
  closeRepairWorkOrder,
  type ClosureSessionContext,
  type ClosureAuditContext,
} from '@/services/workOrderClosure.service';
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

    if (!hasAnyPermission(session, ['work_orders.update', 'work_orders.close'])) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to close work order' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    const body = await request.json();
    const auditCtx = extractAuditContext(request);

    const result = await closeRepairWorkOrder(
      id,
      session as ClosureSessionContext,
      {
        notes: body.notes,
        componentId: body.componentId,
        failureMode: body.failureMode,
        failureCause: body.failureCause,
        correctiveAction: body.correctiveAction,
        pmRecommendation: body.pmRecommendation,
        followUpRequired: body.followUpRequired,
        followUpNotes: body.followUpNotes,
        auditCtx: auditCtx as ClosureAuditContext,
      },
    );

    if (!result.success) {
      const status = result.readiness ? 422 : 400;
      return NextResponse.json({
        success: false,
        error: result.error,
        ...(result.readiness
          ? { blockers: result.readiness.blockers, warnings: result.readiness.warnings }
          : {}),
      }, { status });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to close work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
