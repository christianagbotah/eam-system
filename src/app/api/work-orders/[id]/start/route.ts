import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';
import { startWork, type SessionContext, type AuditContext } from '@/services/workExecution.service';
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

    if (!hasPermission(session, 'work_orders.start') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    // A technician may only own one live execution timer at a time. Enforce
    // this at the canonical WO start boundary, not only in the time-log API.
    if (!isAdmin(session)) {
      const activeSession = await db.workOrderTimeLog.findFirst({
        where: {
          userId: session.userId,
          action: { in: ['start', 'resume'] },
          endTime: null,
        },
        orderBy: { timestamp: 'desc' },
        include: { workOrder: { select: { id: true, woNumber: true } } },
      });

      if (activeSession) {
        if (activeSession.workOrderId === id) {
          return NextResponse.json({
            success: false,
            error: 'You already have an active work session on this work order',
            conflict: {
              workOrderId: id,
              woNumber: activeSession.workOrder?.woNumber,
              startedAt: (activeSession.startTime || activeSession.timestamp).toISOString(),
            },
          }, { status: 409 });
        }

        return NextResponse.json({
          success: false,
          error: `You already have an active work session on WO #${activeSession.workOrder?.woNumber || 'unknown'}. Stop or hand over that session before starting another work order.`,
          conflict: {
            workOrderId: activeSession.workOrderId,
            woNumber: activeSession.workOrder?.woNumber,
            startedAt: (activeSession.startTime || activeSession.timestamp).toISOString(),
          },
        }, { status: 409 });
      }
    }

    const body = await request.json();
    const auditCtx = extractAuditContext(request);

    const result = await startWork(id, session as SessionContext, {
      reason: body.reason,
      notes: body.notes,
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
    const message = error instanceof Error ? error.message : 'Failed to start work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
