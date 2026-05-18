import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_progress', 'skipped', 'completed'],
  in_progress: ['completed', 'skipped', 'failed'],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id, taskId } = await params;
    const body = await request.json();
    const { status, notes, findings } = body;

    if (!status || !VALID_TRANSITIONS[status] || !Array.isArray(VALID_TRANSITIONS[status])) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${Object.keys(VALID_TRANSITIONS).join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch the task execution
    const task = await db.workOrderTaskExecution.findUnique({
      where: { id: taskId },
      include: {
        workOrder: {
          select: {
            id: true,
            assignedTo: true,
            teamLeaderId: true,
            teamMembers: { select: { userId: true, role: true, accessLevel: true } },
          },
        },
      },
    });

    if (!task || task.workOrderId !== id) {
      return NextResponse.json({ success: false, error: 'Task execution not found' }, { status: 404 });
    }

    // Auth check: user must be assignee, team leader, team member, or admin
    const wo = task.workOrder;
    const isAssignee = wo.assignedTo === session.userId;
    const isTeamLeader = wo.teamLeaderId === session.userId;
    const isTeamMember = wo.teamMembers?.some(tm => tm.userId === session.userId) || false;
    const adminUser = isAdmin(session);

    if (!adminUser && !isAssignee && !isTeamLeader && !isTeamMember) {
      return NextResponse.json({ success: false, error: 'Only WO assignee, team members, or admin can update tasks' }, { status: 403 });
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[task.status];
    // Also allow direct complete from pending (shortcut)
    const targetStatus = body.status;
    const validTargets = allowed || [];

    if (!validTargets.includes(targetStatus)) {
      return NextResponse.json(
        { success: false, error: `Cannot transition from '${task.status}' to '${targetStatus}'` },
        { status: 400 }
      );
    }

    // Build update data
    const now = new Date();
    const updateData: Record<string, unknown> = {
      status: targetStatus,
      updatedAt: now,
    };

    // Set completion data for completed/skipped/failed
    if (['completed', 'skipped', 'failed'].includes(targetStatus)) {
      updateData.completedAt = now;
      updateData.completedById = session.userId;
    }

    // If going to in_progress from pending, clear any previous completedAt
    if (targetStatus === 'in_progress') {
      updateData.completedAt = null;
      updateData.completedById = null;
    }

    // Append notes if provided
    if (notes && typeof notes === 'string' && notes.trim()) {
      const existingNotes = task.notes || '';
      const timestamp = now.toISOString();
      const newNote = `[${timestamp}] ${session.username}: ${notes.trim()}`;
      updateData.notes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;
    }

    // Set findings if provided
    if (findings !== undefined) {
      updateData.findings = typeof findings === 'string' && findings.trim() ? findings.trim() : null;
    }

    // Update task
    const updatedTask = await db.workOrderTaskExecution.update({
      where: { id: taskId },
      data: updateData,
      include: {
        completedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'wo_task_execution',
        entityId: taskId,
        oldValues: JSON.stringify({ status: task.status }),
        newValues: JSON.stringify({
          status: targetStatus,
          notes: notes || undefined,
          findings: findings || undefined,
        }),
      },
    });

    return NextResponse.json({ success: true, data: updatedTask });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update task';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
