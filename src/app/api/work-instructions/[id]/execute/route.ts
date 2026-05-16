import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const instruction = await db.workInstruction.findUnique({ where: { id } });

    if (!instruction) {
      return NextResponse.json({ success: false, error: 'Work instruction not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      action,
      workOrderId,
      technicianId,
      stepResults,
      safetyResults,
      toolVerifications,
      partVerifications,
      notes,
      completionEvidence,
    } = body;

    const validActions = ['start', 'pause', 'resume', 'complete', 'abandon'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 },
      );
    }

    const now = new Date();

    // Look for existing execution
    const existingExecution = await db.workInstructionExecution.findFirst({
      where: {
        workInstructionId: id,
        technicianId: technicianId || session.userId,
        status: { in: ['not_started', 'in_progress', 'paused'] },
      },
    });

    let execution;

    if (existingExecution) {
      // Update existing execution
      const updateData: Record<string, unknown> = {};

      switch (action) {
        case 'start':
          updateData.status = 'in_progress';
          updateData.startedAt = existingExecution.startedAt || now.toISOString();
          updateData.pausedAt = null;
          break;
        case 'pause':
          updateData.status = 'paused';
          updateData.pausedAt = now.toISOString();
          break;
        case 'resume':
          updateData.status = 'in_progress';
          updateData.pausedAt = null;
          break;
        case 'complete': {
          const startTime = existingExecution.startedAt
            ? new Date(existingExecution.startedAt)
            : now;
          const durationMs = now.getTime() - startTime.getTime();
          const durationMin = Math.round(durationMs / (1000 * 60));
          updateData.status = 'completed';
          updateData.completedAt = now.toISOString();
          updateData.totalDuration = durationMin;
          updateData.pausedAt = null;
          break;
        }
        case 'abandon':
          updateData.status = 'abandoned';
          break;
      }

      if (stepResults !== undefined) updateData.stepResults = stepResults;
      if (safetyResults !== undefined) updateData.safetyResults = safetyResults;
      if (toolVerifications !== undefined) updateData.toolVerifications = toolVerifications;
      if (partVerifications !== undefined) updateData.partVerifications = partVerifications;
      if (notes !== undefined) updateData.notes = notes;
      if (completionEvidence !== undefined) updateData.completionEvidence = completionEvidence;

      // Calculate current step from step results
      if (stepResults && Array.isArray(stepResults) && stepResults.length > 0) {
        const completedSteps = stepResults.filter(
          (s: { status: string }) => s.status === 'completed',
        );
        updateData.currentStep = completedSteps.length + 1;
      }

      execution = await db.workInstructionExecution.update({
        where: { id: existingExecution.id },
        data: updateData,
      });
    } else {
      // Create new execution
      if (action !== 'start') {
        return NextResponse.json(
          { success: false, error: 'Must start execution before performing other actions' },
          { status: 400 },
        );
      }

      execution = await db.workInstructionExecution.create({
        data: {
          workInstructionId: id,
          workOrderId: workOrderId || '',
          technicianId: technicianId || session.userId,
          status: 'in_progress',
          currentStep: 1,
          startedAt: now.toISOString(),
          completedAt: null,
          pausedAt: null,
          totalDuration: null,
          stepResults: stepResults || [],
          safetyResults: safetyResults || [],
          toolVerifications: toolVerifications || [],
          partVerifications: partVerifications || [],
          notes: notes || '',
          completionEvidence: completionEvidence || [],
        },
      });
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'execute_work_instruction',
        entityType: 'work_instruction_execution',
        entityId: execution.id,
        newValues: JSON.stringify({ workInstructionId: id, action, status: execution.status }),
      },
    });

    return NextResponse.json({ success: true, data: execution });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to execute work instruction';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
