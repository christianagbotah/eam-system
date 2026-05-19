import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

// POST /api/work-instructions/executions/[id]/review — supervisor review
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
    const body = await request.json();
    const { decision, reviewNotes, qualityScore } = body;

    if (!decision || !['approved', 'rejected', 'revision_required'].includes(decision)) {
      return NextResponse.json(
        { success: false, error: 'Decision is required (approved/rejected/revision_required)' },
        { status: 400 },
      );
    }

    const execution = await db.workInstructionExecution.findUnique({
      where: { id },
      include: { workInstruction: true },
    });

    if (!execution) {
      return NextResponse.json({ success: false, error: 'Execution not found' }, { status: 404 });
    }

    if (execution.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Only completed executions can be reviewed' },
        { status: 400 },
      );
    }

    // Parse existing completionEvidence and add review
    let evidence: Record<string, unknown> = {};
    try {
      evidence = execution.completionEvidence ? JSON.parse(execution.completionEvidence) : {};
    } catch {
      /* keep empty */
    }

    const reviewData = {
      ...evidence,
      review: {
        reviewerId: session.userId,
        reviewerName: session.username || 'Unknown',
        decision,
        reviewNotes: reviewNotes || '',
        qualityScore: qualityScore ?? null,
        reviewedAt: new Date().toISOString(),
      },
    };

    const [updated] = await db.$transaction([
      db.workInstructionExecution.update({
        where: { id },
        data: {
          completionEvidence: JSON.stringify(reviewData),
        },
        include: { workInstruction: { select: { id: true, title: true } } },
      }),
    ]);

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'review',
        entityType: 'work_instruction_execution',
        entityId: id,
        newValues: JSON.stringify({ decision, reviewNotes, qualityScore }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to review execution';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
