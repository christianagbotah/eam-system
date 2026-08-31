import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission } from '@/lib/auth';
import { plannerClose, type SessionContext, type AuditContext } from '@/services/workExecution.service';
import { normalizeWorkOrderTimeLogs } from '@/services/workOrderTimeLogNormalization.service';
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
        { status: 403 }
      );
    }

    const { id } = await params;

    // Plant authorization
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    // Planner close recalculates authoritative costs. Normalize timestamp-only
    // legacy rows (including the completion marker) before that calculation.
    await normalizeWorkOrderTimeLogs(id);

    const body = await request.json();
    const auditCtx = extractAuditContext(request);

    const result = await plannerClose(id, session as SessionContext, {
      notes: body.notes,
      failureMode: body.failureMode,
      failureCause: body.failureCause,
      correctiveAction: body.correctiveAction,
      pmRecommendation: body.pmRecommendation,
      followUpRequired: body.followUpRequired,
      followUpNotes: body.followUpNotes,
      auditCtx: auditCtx as AuditContext,
    });

    if (!result.success) {
      const status = result.readiness ? 422 : 400;
      return NextResponse.json({
        success: false,
        error: result.error,
        ...(result.readiness ? { blockers: result.readiness.blockers, warnings: result.readiness.warnings } : {}),
      }, { status });
    }

    await db.repairCompletion.updateMany({
      where: { workOrderId: id },
      data: {
        plannerStatus: 'closed',
        plannerClosedById: session.userId,
        plannerClosedAt: new Date(),
        closureNotes: body.notes || null,
      },
    });

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to close work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
