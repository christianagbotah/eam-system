import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';
import { checkReadiness } from '@/services/workOrderReadiness.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    const wo = await db.workOrder.findUnique({
      where: { id },
      select: {
        assignedTo: true,
        teamLeaderId: true,
        teamMembers: { select: { userId: true } },
      },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    const canViewAll =
      isAdmin(session) ||
      hasPermission(session, 'work_orders.view') ||
      hasPermission(session, 'work_orders.view_all');
    const isAssigned = wo.assignedTo === session.userId;
    const isTeamLeader = wo.teamLeaderId === session.userId;
    const isTeamMember = wo.teamMembers.some((member) => member.userId === session.userId);

    if (!canViewAll && !isAssigned && !isTeamLeader && !isTeamMember) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const phaseParam = new URL(request.url).searchParams.get('phase') || 'complete';
    if (phaseParam !== 'start' && phaseParam !== 'complete') {
      return NextResponse.json(
        { success: false, error: "Invalid readiness phase. Use 'start' or 'complete'." },
        { status: 400 },
      );
    }

    const readiness = await checkReadiness(id, phaseParam);
    return NextResponse.json({ success: true, data: readiness });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to evaluate work order readiness';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
