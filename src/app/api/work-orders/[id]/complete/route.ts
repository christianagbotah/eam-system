import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';
import { submitCompletion, type SessionContext, type AuditContext } from '@/services/workExecution.service';
import { normalizeWorkOrderTimeLogs } from '@/services/workOrderTimeLogNormalization.service';
import { extractAuditContext } from '@/lib/audit-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'work_orders.complete') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Plant authorization
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    // Normalize legacy/mixed time-log rows before the authoritative cost snapshot.
    // This never closes active timers; readiness checks still block those normally.
    const normalizedTime = await normalizeWorkOrderTimeLogs(id);

    const body = await request.json();
    const auditCtx = extractAuditContext(request);

    const result = await submitCompletion(id, session as SessionContext, {
      notes: body.notes,
      failureDescription: body.failureDescription,
      causeDescription: body.causeDescription,
      actionDescription: body.actionDescription,
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

    // The execution service also tracks calendar elapsed time from actualStart.
    // For cost/accounting purposes actualHours must remain labor effort from
    // canonical time logs, not wall-clock WO elapsed time.
    await db.workOrder.update({
      where: { id },
      data: { actualHours: normalizedTime.laborHours },
    });
    if (result.data) {
      result.data.actualHours = normalizedTime.laborHours;
    }

    // Materialize the canonical completion report required by the supervisor
    // verification gate. All totals are derived from the server-side WO cost
    // snapshot produced by submitCompletion; client-submitted totals are ignored.
    const completedSnapshot = await db.workOrder.findUnique({
      where: { id },
      select: {
        actualHours: true,
        laborCost: true,
        partsCost: true,
        contractorCost: true,
        totalCost: true,
        failureDescription: true,
        causeDescription: true,
        actionDescription: true,
        workOrderDowntimes: { select: { durationMinutes: true } },
      },
    });

    if (!completedSnapshot) {
      throw new Error('Completed work order could not be reloaded for completion report');
    }

    const totalDowntimeMinutes = completedSnapshot.workOrderDowntimes.reduce(
      (sum, downtime) => sum + (downtime.durationMinutes ?? 0),
      0,
    );
    const totalToolCost = Math.max(
      0,
      Math.round(
        (completedSnapshot.totalCost
          - completedSnapshot.laborCost
          - completedSnapshot.partsCost
          - completedSnapshot.contractorCost) * 100,
      ) / 100,
    );

    await db.repairCompletion.upsert({
      where: { workOrderId: id },
      create: {
        workOrderId: id,
        completionNotes: body.notes || null,
        findings: body.failureDescription || completedSnapshot.failureDescription || null,
        rootCause: body.causeDescription || completedSnapshot.causeDescription || null,
        correctiveAction: body.actionDescription || completedSnapshot.actionDescription || null,
        totalLaborHours: completedSnapshot.actualHours ?? normalizedTime.laborHours,
        totalMaterialCost: completedSnapshot.partsCost,
        totalToolCost,
        totalDowntimeMinutes,
        supervisorStatus: 'pending_review',
        plannerStatus: 'pending_closure',
      },
      update: {
        completionNotes: body.notes || undefined,
        findings: body.failureDescription || completedSnapshot.failureDescription || undefined,
        rootCause: body.causeDescription || completedSnapshot.causeDescription || undefined,
        correctiveAction: body.actionDescription || completedSnapshot.actionDescription || undefined,
        totalLaborHours: completedSnapshot.actualHours ?? normalizedTime.laborHours,
        totalMaterialCost: completedSnapshot.partsCost,
        totalToolCost,
        totalDowntimeMinutes,
        supervisorStatus: 'pending_review',
        plannerStatus: 'pending_closure',
      },
    });

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to complete work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
