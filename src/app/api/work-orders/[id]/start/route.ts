import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';
import {
  startWorkOrderExecution,
  type StartExecutionSessionContext,
  type StartExecutionAuditContext,
} from '@/services/workOrderStartExecution.service';
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

    // Fast conflict pre-check for a clear 409 response. The canonical start
    // service repeats this check inside its transaction, so this is UX only and
    // is not the authoritative enforcement boundary.
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

    const result = await startWorkOrderExecution(
      id,
      session as StartExecutionSessionContext,
      {
        reason: typeof body.reason === 'string' ? body.reason : undefined,
        notes: typeof body.notes === 'string' ? body.notes : undefined,
        auditCtx: auditCtx as StartExecutionAuditContext,
      },
    );

    if (!result.success) {
      const status = result.conflict ? 409 : result.readiness ? 422 : result.error === 'Work order not found' ? 404 : 400;
      return NextResponse.json({
        success: false,
        error: result.error,
        ...(result.conflict ? { conflict: result.conflict } : {}),
        ...(result.readiness ? { blockers: result.readiness.blockers, warnings: result.readiness.warnings } : {}),
      }, { status });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
