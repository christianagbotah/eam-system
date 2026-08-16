import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { getPlantScope } from '@/lib/plant-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Auth check
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // 2. Fetch the WO with relevant assignment/team fields
    const wo = await db.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        assignedTo: true,
        teamLeaderId: true,
        assignedSupervisorId: true,
        plannerId: true,
        plantId: true,
        isLocked: true,
        teamMembers: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });

    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // 3. Plant scope check (IDOR protection)
    if (wo.plantId) {
      const plantScope = await getPlantScope(request, session);
      if (plantScope.isScoped && plantScope.plantId && wo.plantId !== plantScope.plantId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    // 4. Derive roles from WO assignment
    const userId = session.userId;
    const isAssignee = wo.assignedTo === userId;
    const isTeamLeaderFromField = wo.teamLeaderId === userId;
    const isTeamLeaderFromMembers = wo.teamMembers?.some(m => m.userId === userId && m.role === 'team_leader') ?? false;
    const isTeamMember = wo.teamMembers?.some(m => m.userId === userId) ?? false;
    const isSupervisor = wo.assignedSupervisorId === userId;
    const isPlanner = wo.plannerId === userId;
    const isAdminUser = isAdmin(session) || session.roles.some(r =>
      ['maintenance_manager', 'plant_manager'].includes(r),
    );

    const isTeamLeader = isTeamLeaderFromField || isTeamLeaderFromMembers;

    const hasMultipleTeamMembers = (wo.teamMembers?.length ?? 0) > 1;

    // Status sets for capability checks
    const preExecutionStatuses = ['assigned', 'planned'];
    const activeExecutionStatuses = ['in_progress', 'on_hold', 'waiting_parts', 'waiting_tools', 'waiting_shutdown', 'waiting_permit', 'pending_handover'];

    // 5. Derive capabilities
    const capabilities = {
      canStart: (isAssignee || isTeamLeader || isAdminUser) && preExecutionStatuses.includes(wo.status),
      canPause: (isAssignee || isTeamLeader || isAdminUser) && wo.status === 'in_progress',
      canResume: (isAssignee || isTeamLeader || isAdminUser) && wo.status === 'on_hold',
      canLogOwnTime: (isAssignee || isTeamMember || isTeamLeader) && activeExecutionStatuses.includes(wo.status),
      canLogTeamTime: isTeamLeader && hasMultipleTeamMembers && activeExecutionStatuses.includes(wo.status),
      canRequestTools: (isAssignee || isTeamMember || isTeamLeader) && activeExecutionStatuses.includes(wo.status),
      canRequestMaterials: (isAssignee || isTeamMember || isTeamLeader) && activeExecutionStatuses.includes(wo.status),
      canRequestAssistance: (isAssignee || isTeamMember || isTeamLeader) && activeExecutionStatuses.includes(wo.status),
      canHandover: (isAssignee || isTeamLeader) && wo.status === 'in_progress',
      canSubmitCompletion: hasMultipleTeamMembers
        ? (isTeamLeader && wo.status === 'in_progress')
        : (isAssignee && wo.status === 'in_progress'),
      canVerify: isSupervisor && wo.status === 'completed',
      canClose: isPlanner && wo.status === 'verified',
      isTeamLeader,
      isTeamMember,
      isSupervisor,
      isPlanner,
      isAdmin: isAdminUser,
    };

    return NextResponse.json({ success: true, data: capabilities });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch capabilities';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
