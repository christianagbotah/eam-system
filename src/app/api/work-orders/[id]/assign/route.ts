import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, isAdmin as isAdminCheck } from '@/lib/auth';
import { executeTransition } from '@/lib/state-machine';
import { notifyUser } from '@/lib/notifications';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';
import type { Prisma } from '@prisma/client';

type TeamMemberInput = {
  userId: string;
  role?: string;
};

type AssignmentBody = {
  assignedTo?: string;
  teamLeaderId?: string;
  assignedSupervisorId?: string;
  assignmentType?: 'direct' | 'via_supervisor';
  teamMembers?: TeamMemberInput[];
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasAnyPermission(session, ['work_orders.assign_supervisor'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body: AssignmentBody = await request.json();

    // Plant authorization for caller
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    const {
      assignedTo,
      teamLeaderId,
      assignedSupervisorId,
      assignmentType: rawAssignmentType,
      teamMembers,
    } = body;

    // Backward compatibility: missing assignmentType defaults to 'direct'
    const assignmentType = rawAssignmentType || 'direct';
    const isViaSupervisor = assignmentType === 'via_supervisor';
    const isDirect = assignmentType === 'direct';
    const isUserAdmin = isAdminCheck(session);

    // ── Validation ─────────────────────────────────────────────────────────

    if (isViaSupervisor) {
      if (!assignedSupervisorId) {
        return NextResponse.json(
          { success: false, error: 'assignedSupervisorId is required for via_supervisor assignment' },
          { status: 400 },
        );
      }
    }

    if (isDirect) {
      const hasAssignedTo = !!assignedTo;
      const hasTeamMembers = Array.isArray(teamMembers) && teamMembers.length > 0;

      if (!hasAssignedTo && !hasTeamMembers) {
        return NextResponse.json(
          { success: false, error: 'assignedTo or teamMembers is required for direct assignment' },
          { status: 400 },
        );
      }

      // Validate teamLeaderId rules
      if (hasTeamMembers && teamMembers!.length > 1) {
        if (!teamLeaderId) {
          return NextResponse.json(
            { success: false, error: 'teamLeaderId is required when teamMembers has more than one member' },
            { status: 400 },
          );
        }
        const leaderInTeam = teamMembers!.some((m) => m.userId === teamLeaderId);
        if (!leaderInTeam) {
          return NextResponse.json(
            { success: false, error: 'teamLeaderId must be one of the teamMembers' },
            { status: 400 },
          );
        }
      }

      // Validate each team member has userId
      if (hasTeamMembers) {
        for (const m of teamMembers!) {
          if (!m.userId) {
            return NextResponse.json(
              { success: false, error: 'Each team member must have a userId' },
              { status: 400 },
            );
          }
        }
      }
    }

    // ── Fetch WO with plant info ───────────────────────────────────────────

    const wo = await db.workOrder.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // Capture actual old values for audit log
    const oldValues = {
      assignedTo: wo.assignedTo,
      teamLeaderId: wo.teamLeaderId,
      assignedSupervisorId: wo.assignedSupervisorId,
      assignmentType: wo.assignmentType,
    };

    // ── Plant-scope check helper ───────────────────────────────────────────

    const plantScopeUserIds: string[] = [];

    if (isDirect) {
      if (assignedTo) plantScopeUserIds.push(assignedTo);
      if (teamLeaderId) plantScopeUserIds.push(teamLeaderId);
      if (teamMembers) {
        for (const m of teamMembers) {
          if (m.userId && !plantScopeUserIds.includes(m.userId)) {
            plantScopeUserIds.push(m.userId);
          }
        }
      }
    }
    if (assignedSupervisorId && !plantScopeUserIds.includes(assignedSupervisorId)) {
      plantScopeUserIds.push(assignedSupervisorId);
    }

    // Deduplicate
    const uniqueUserIds = [...new Set(plantScopeUserIds)];

    if (wo.plantId && uniqueUserIds.length > 0) {
      const plantAccessRows = await db.userPlant.findMany({
        where: {
          userId: { in: uniqueUserIds },
          plantId: wo.plantId,
        },
        select: { userId: true },
      });
      const usersWithAccess = new Set(plantAccessRows.map((r) => r.userId));

      for (const uid of uniqueUserIds) {
        if (!usersWithAccess.has(uid) && !isUserAdmin) {
          return NextResponse.json(
            { success: false, error: `User ${uid} does not have access to plant ${wo.plantId}` },
            { status: 403 },
          );
        }
      }
    }

    // ── Verify users exist ─────────────────────────────────────────────────

    const allUserIdsToVerify: string[] = [];
    if (isDirect) {
      if (assignedTo) allUserIdsToVerify.push(assignedTo);
      if (teamMembers) {
        for (const m of teamMembers) {
          if (m.userId && !allUserIdsToVerify.includes(m.userId)) {
            allUserIdsToVerify.push(m.userId);
          }
        }
      }
    }
    if (assignedSupervisorId && !allUserIdsToVerify.includes(assignedSupervisorId)) {
      allUserIdsToVerify.push(assignedSupervisorId);
    }

    if (allUserIdsToVerify.length > 0) {
      const users = await db.user.findMany({
        where: { id: { in: allUserIdsToVerify } },
        select: { id: true, fullName: true },
      });
      const existingUserIds = new Set(users.map((u) => u.id));
      for (const uid of allUserIdsToVerify) {
        if (!existingUserIds.has(uid)) {
          return NextResponse.json(
            { success: false, error: `User ${uid} not found` },
            { status: 400 },
          );
        }
      }
    }

    // ── Determine effective assignment values ──────────────────────────────

    let effectiveAssignedTo = wo.assignedTo; // preserve existing
    let effectiveTeamLeaderId = wo.teamLeaderId; // preserve existing

    if (isDirect) {
      const hasAssignedTo = !!assignedTo;
      const hasTeamMembers = Array.isArray(teamMembers) && teamMembers!.length > 0;

      if (hasAssignedTo && !hasTeamMembers) {
        // Single assignee, no team array → they are both assignedTo and team leader
        effectiveAssignedTo = assignedTo!;
        effectiveTeamLeaderId = assignedTo!;
      } else if (hasTeamMembers && !hasAssignedTo) {
        // Team members only, no explicit assignedTo
        effectiveAssignedTo = teamMembers![0].userId;
        effectiveTeamLeaderId = teamMembers!.length === 1
          ? teamMembers![0].userId
          : teamLeaderId!;
      } else if (hasAssignedTo && hasTeamMembers) {
        // Both provided
        effectiveAssignedTo = assignedTo!;
        effectiveTeamLeaderId = teamMembers!.length === 1
          ? teamMembers![0].userId
          : teamLeaderId!;
      }
    }
    // For via_supervisor: assignedTo/teamLeaderId stay as-is (preserved above)

    const now = new Date();

    // ── Execute everything inside a transaction ────────────────────────────

    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Execute status transition via state machine
      const transitionResult = await executeTransition(
        'work_order',
        id,
        'assigned',
        session,
        {
          extraData: {
            assignedTo: effectiveAssignedTo,
            teamLeaderId: effectiveTeamLeaderId,
            assignedSupervisorId: assignedSupervisorId || null,
            assignedBy: session.userId,
            assignmentType,
          },
          tx,
        },
      );

      if (!transitionResult.success) {
        throw new Error(transitionResult.error);
      }

      // 2. Create/upsert team members
      if (isDirect) {
        const membersToAdd: { userId: string; role: string; isLeader: boolean }[] = [];

        const hasAssignedTo = !!assignedTo;
        const hasTeamMembers = Array.isArray(teamMembers) && teamMembers!.length > 0;

        if (hasAssignedTo && !hasTeamMembers) {
          // Single assignee
          membersToAdd.push({
            userId: assignedTo!,
            role: 'team_leader',
            isLeader: true,
          });
        } else if (hasTeamMembers) {
          for (const m of teamMembers!) {
            const isLeader = m.userId === effectiveTeamLeaderId;
            membersToAdd.push({
              userId: m.userId,
              role: isLeader ? 'team_leader' : (m.role || 'assistant'),
              isLeader,
            });
          }
        }

        // Also add assignedTo to team if they're not already in the list
        if (hasAssignedTo && hasTeamMembers && !teamMembers!.some((m) => m.userId === assignedTo)) {
          const isLeader = assignedTo === effectiveTeamLeaderId;
          membersToAdd.push({
            userId: assignedTo!,
            role: isLeader ? 'team_leader' : 'assistant',
            isLeader,
          });
        }

        // Upsert each member
        for (const m of membersToAdd) {
          const accessLevel = m.isLeader ? 'full' : 'execution';

          await tx.workOrderTeamMember.upsert({
            where: {
              workOrderId_userId: {
                workOrderId: id,
                userId: m.userId,
              },
            },
            update: {
              role: m.role,
              accessLevel,
              addedById: session.userId,
              addedVia: 'direct',
              assignedAt: now,
            },
            create: {
              workOrderId: id,
              userId: m.userId,
              role: m.role,
              accessLevel,
              addedById: session.userId,
              addedVia: 'direct',
              assignedAt: now,
            },
          });
        }
      }

      // 3. Domain-specific audit log
      const newValues: Record<string, unknown> = {
        assignmentType,
      };
      if (effectiveAssignedTo) newValues.assignedTo = effectiveAssignedTo;
      if (effectiveTeamLeaderId) newValues.teamLeaderId = effectiveTeamLeaderId;
      if (assignedSupervisorId) newValues.assignedSupervisorId = assignedSupervisorId;
      if (teamMembers && teamMembers.length > 0) {
        newValues.teamMembersCount = teamMembers.length;
      }

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'update',
          entityType: 'work_order',
          entityId: id,
          oldValues: JSON.stringify(oldValues),
          newValues: JSON.stringify(newValues),
        },
      });

      return transitionResult;
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // ── Fire-and-forget notifications ──────────────────────────────────────

    // Notify assigned technician (direct assignment only)
    if (isDirect && effectiveAssignedTo && effectiveAssignedTo !== session.userId) {
      notifyUser(
        effectiveAssignedTo,
        'wo_assigned',
        'Work Order Assigned',
        `${session.fullName} assigned ${wo.woNumber} to you: "${wo.title}"`,
        'work_order',
        id,
        `wo-detail?id=${id}`,
        { forceSms: true },
      ).catch(() => {});
    }

    // Notify team members
    if (isDirect && Array.isArray(teamMembers) && teamMembers.length > 0) {
      for (const member of teamMembers) {
        if (member.userId !== session.userId && member.userId !== effectiveAssignedTo) {
          notifyUser(
            member.userId,
            'wo_assigned',
            'Work Order Team Assignment',
            `${session.fullName} assigned you to the team for ${wo.woNumber}: "${wo.title}"`,
            'work_order',
            id,
            `wo-detail?id=${id}`,
            { forceSms: true },
          ).catch(() => {});
        }
      }
    }

    // Notify supervisor (both paths)
    if (assignedSupervisorId && assignedSupervisorId !== session.userId) {
      const supervisorMsg = isViaSupervisor
        ? `${session.fullName} delegated ${wo.woNumber} to you for assignment: "${wo.title}"`
        : `${session.fullName} assigned ${wo.woNumber} with you as supervisor: "${wo.title}"`;
      notifyUser(
        assignedSupervisorId,
        'wo_assigned',
        isViaSupervisor ? 'Work Order Delegated' : 'Work Order Supervisor Assignment',
        supervisorMsg,
        'work_order',
        id,
        `wo-detail?id=${id}`,
        { forceSms: true },
      ).catch(() => {});
    }

    // ── Re-fetch with includes for response ────────────────────────────────

    const updated = await db.workOrder.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
        assignedSupervisor: { select: { id: true, fullName: true, username: true } },
        assigner: { select: { id: true, fullName: true, username: true } },
        maintenanceRequest: { select: { id: true, requestNumber: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to assign work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
