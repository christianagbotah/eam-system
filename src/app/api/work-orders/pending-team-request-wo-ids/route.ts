import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, isAdmin } from '@/lib/auth';

/**
 * GET /api/work-orders/pending-team-request-wo-ids
 * Returns a list of WO IDs that have pending team member requests.
 * Used by the WO list page to show indicator badges for planners/admins.
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const canManage = isAdmin(session) || hasAnyPermission(session, ['work_orders.assign', 'work_orders.*']);
    if (!canManage) {
      return NextResponse.json({ success: true, data: [] });
    }

    const pendingReqs = await db.woTeamMemberRequest.findMany({
      where: {
        status: 'pending',
        // Non-admins only see WOs they planned or assigned
        ...(isAdmin(session) ? {} : { OR: [
          { workOrder: { plannerId: session.userId } },
          { workOrder: { assignedBy: session.userId } },
        ]}),
      },
      select: {
        workOrderId: true,
      },
      distinct: ['workOrderId'],
    });

    const woIds = pendingReqs.map(r => r.workOrderId);
    return NextResponse.json({ success: true, data: woIds });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch pending team request WO IDs';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
