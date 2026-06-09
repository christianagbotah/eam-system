import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';

// Valid target statuses a task can transition TO
const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'skipped', 'failed'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

// Transition rules: from → [allowed targets]
const VALID_TRANSITIONS: Record<string, ValidStatus[]> = {
  pending: ['in_progress', 'skipped', 'completed'],
  in_progress: ['completed', 'skipped', 'failed', 'pending'], // allow going back to pending
  completed: ['pending', 'in_progress'],  // allow undo
  skipped: ['pending', 'in_progress'],   // allow undo
  failed: ['pending', 'in_progress'],    // allow retry
};

// Human-readable status labels
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
  failed: 'Failed',
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

    // Validate that status is a valid target
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const targetStatus = status as ValidStatus;

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
    if (!allowed || !allowed.includes(targetStatus)) {
      return NextResponse.json(
        { success: false, error: `Cannot transition from '${STATUS_LABELS[task.status] || task.status}' to '${STATUS_LABELS[targetStatus] || targetStatus}'` },
        { status: 400 }
      );
    }

    // Build update data
    const now = new Date();
    const updateData: Record<string, unknown> = {
      status: targetStatus,
      updatedAt: now,
    };

    // Set completion data for terminal statuses
    if (['completed', 'skipped', 'failed'].includes(targetStatus)) {
      updateData.completedAt = now;
      updateData.completedById = session.userId;
    }

    // Clear completion data when reverting to pending/in_progress
    if (['pending', 'in_progress'].includes(targetStatus)) {
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
