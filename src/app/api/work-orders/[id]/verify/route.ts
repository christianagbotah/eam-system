import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { supervisorVerify, requestRework, type SessionContext, type AuditContext } from '@/services/workExecution.service';
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

    if (!hasPermission(session, 'work_orders.verify') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const auditCtx = extractAuditContext(request);

    if (body.action === 'rework') {
      const result = await requestRework(id, session as SessionContext, {
        reason: body.reason,
        category: body.category,
        evidence: body.evidence,
        auditCtx: auditCtx as AuditContext,
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      // requestRework() owns the rework counter transactionally. Keep the
      // completion-review status aligned here without incrementing it twice.
      await db.repairCompletion.updateMany({
        where: { workOrderId: id },
        data: {
          supervisorStatus: 'rework_requested',
          reworkReason: body.reason || null,
          supervisorReviewNotes: body.notes || null,
        },
      });

      return NextResponse.json({ success: true, data: result.data });
    }

    // Verify path
    const result = await supervisorVerify(id, session as SessionContext, {
      notes: body.notes,
      qualityRating: body.qualityRating,
      checklistPassed: body.checklistPassed,
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
        supervisorStatus: 'approved',
        supervisorApprovedById: session.userId,
        supervisorApprovedAt: new Date(),
        supervisorReviewNotes: body.notes || null,
      },
    });

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
