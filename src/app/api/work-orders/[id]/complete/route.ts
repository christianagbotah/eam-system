import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { getPlantScope, canAccessPlant } from '@/lib/plant-scope';
import { submitCompletion, type SessionContext, type AuditContext } from '@/services/workExecution.service';
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

    // Plant scope check (denyAccess + canAccessPlant)
    const woForScope = await db.workOrder.findUnique({ where: { id }, select: { id: true, plantId: true } });
    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess || !canAccessPlant(plantScope, woForScope?.plantId)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
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

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to complete work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
