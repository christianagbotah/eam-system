import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ============================================================================
// POST /api/pm-templates/[id]/tasks — Add a task to a template
// ============================================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { description, taskType, requiredParts, estimatedMinutes, taskNumber } = body;

    if (!description || !taskType) {
      return NextResponse.json(
        { success: false, error: 'Description and task type are required' },
        { status: 400 }
      );
    }

    // Verify template exists
    const template = await db.pmTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'PM template not found' },
        { status: 404 }
      );
    }

    // Auto-increment taskNumber if not provided
    let nextNumber: number;
    if (taskNumber !== undefined) {
      nextNumber = Number(taskNumber);
    } else {
      const maxTask = await db.pmTemplateTask.findFirst({
        where: { templateId: id },
        orderBy: { taskNumber: 'desc' },
        select: { taskNumber: true },
      });
      nextNumber = (maxTask?.taskNumber ?? 0) + 1;
    }

    const task = await db.pmTemplateTask.create({
      data: {
        templateId: id,
        taskNumber: nextNumber,
        description,
        taskType,
        requiredParts: requiredParts ? JSON.stringify(requiredParts) : null,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        sortOrder: nextNumber,
      },
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add task';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// PUT /api/pm-templates/[id]/tasks — Reorder tasks
// Body: { taskIds: string[] } — new ordered list of task IDs
// ============================================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { taskIds } = body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'taskIds array is required' },
        { status: 400 }
      );
    }

    // Verify template exists
    const template = await db.pmTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'PM template not found' },
        { status: 404 }
      );
    }

    // Update taskNumber and sortOrder for each task based on array position
    await db.$transaction(
      taskIds.map((taskId: string, index: number) =>
        db.pmTemplateTask.update({
          where: { id: taskId },
          data: {
            taskNumber: index + 1,
            sortOrder: index + 1,
          },
        })
      )
    );

    // Return updated tasks in new order
    const updatedTasks = await db.pmTemplateTask.findMany({
      where: { templateId: id, isActive: true },
      orderBy: { taskNumber: 'asc' },
    });

    return NextResponse.json({ success: true, data: updatedTasks });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reorder tasks';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
