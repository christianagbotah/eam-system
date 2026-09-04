import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';
import { extractAuditContext } from '@/lib/audit-helpers';
import {
  requestRepairRework,
  type ReworkSessionContext,
  type ReworkAuditContext,
} from '@/services/workOrderRework.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'work_orders.verify') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    const body = await request.json();
    const auditCtx = extractAuditContext(request);

    const result = await requestRepairRework(
      id,
      session as ReworkSessionContext,
      {
        reason: body.reason,
        category: body.category,
        evidence: body.evidence,
        notes: body.notes,
        auditCtx: auditCtx as ReworkAuditContext,
      },
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Rework operation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
