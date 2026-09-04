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

    // Fast conflict pre-check for a clear 409 response. An unclosed timer row is
    // not by itself proof of live work: only sessions whose parent WO is still
    // in_progress can block the technician. The canonical service repeats this
    // check transactionally, so this remains a UX optimization only.
    if (!isAdmin(session)) {
      const activeSession = await db.workOrderTimeLog.findFirst({
        where: {
          userId: session.userId,
          action: { in: ['start', 'resume'] },
          endTime: null,
          workOrder: { status: 'in_progress' },
        },
        orderBy: { timestamp: 'desc' },
        select: {
          workOrderId: true,
          startTime: true,
          timestamp: true,
          workOrder: {
            select: {
              id: true,
              woNumber: true,
              title: true,
              status: true,
            },
          },
        },
      });

      if (activeSession) {
        const sameWorkOrder = activeSession.workOrderId === id;
        const conflict = {
          workOrderId: activeSession.workOrderId,
          woNumber: activeSession.workOrder?.woNumber,
          title: activeSession.workOrder?.title,
          status: 'in_progress' as const,
          startedAt: (activeSession.startTime || activeSession.timestamp).toISOString(),
        };

        if (sameWorkOrder) {
          return NextResponse.json({
            success: false,
            reason: 'ACTIVE_SESSION_ALREADY_RUNNING',
            error: 'You already have an active work session on this work order',
            conflict,
          }, { status: 409 });
        }

        return NextResponse.json({
          success: false,
          reason: 'ACTIVE_SESSION_CONFLICT',
          error: `You already have active work on WO #${activeSession.workOrder?.woNumber || 'unknown'}${activeSession.workOrder?.title ? ` (${activeSession.workOrder.title})` : ''}. Open that work order and pause, hand over, or complete it before starting another.`,
          conflict,
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
        ...(result.reason ? { reason: result.reason } : {}),
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
