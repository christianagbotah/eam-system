import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';
import {
  submitRepairCompletion,
  type CompletionSessionContext,
  type CompletionAuditContext,
} from '@/services/workOrderCompletion.service';
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
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    const body = await request.json();
    const auditCtx = extractAuditContext(request);

    const result = await submitRepairCompletion(
      id,
      session as CompletionSessionContext,
      {
        notes: body.notes,
        failureDescription: body.failureDescription,
        causeDescription: body.causeDescription,
        actionDescription: body.actionDescription,
        auditCtx: auditCtx as CompletionAuditContext,
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
    const message = error instanceof Error ? error.message : 'Failed to complete work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
