import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// ============================================================================
// DELETE /api/pm-templates/[id]/tasks/[taskId] — Delete a specific task
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id, taskId } = await params;

    // Verify template exists
    const template = await db.pmTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'PM template not found' },
        { status: 404 }
      );
    }

    // Verify task exists and belongs to the template
    const task = await db.pmTemplateTask.findFirst({
      where: { id: taskId, templateId: id },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found in this template' },
        { status: 404 }
      );
    }

    await db.pmTemplateTask.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ success: true, data: { id: taskId } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete task';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
