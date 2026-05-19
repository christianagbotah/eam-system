import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

// POST /api/work-instructions/link-work-order — link WI to WO
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'work_orders.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { workInstructionId, workOrderId } = body;

    if (!workInstructionId || !workOrderId) {
      return NextResponse.json(
        { success: false, error: 'workInstructionId and workOrderId are required' },
        { status: 400 },
      );
    }

    // Verify both exist
    const [wi, wo] = await Promise.all([
      db.workInstruction.findUnique({ where: { id: workInstructionId } }),
      db.workOrder.findUnique({ where: { id: workOrderId } }),
    ]);

    if (!wi) {
      return NextResponse.json({ success: false, error: 'Work instruction not found' }, { status: 404 });
    }
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // Create execution link
    const execution = await db.workInstructionExecution.create({
      data: {
        workInstructionId,
        workOrderId,
        technicianId: wo.assignedTo || session.userId,
        status: 'not_started',
        currentStep: 0,
      },
      include: {
        workInstruction: { select: { id: true, title: true } },
      },
    });

    // Audit
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'work_instruction_execution',
        entityId: execution.id,
        newValues: JSON.stringify({ workInstructionId, workOrderId, linkedBy: session.userId }),
      },
    });

    return NextResponse.json({ success: true, data: execution }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to link work instruction to work order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
