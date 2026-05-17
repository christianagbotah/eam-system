import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { handleApiError } from '@/lib/errors';
import { WorkflowEngineService } from '@/services/workflow/engine.service';

// POST /api/workflow/instances/[id]/advance — advance workflow to next step
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const result = await WorkflowEngineService.advanceWorkflow(id, {
      stepId: body.stepId,
      action: body.action ?? 'complete',
      performedById: session.userId,
      comment: body.comment,
      variables: body.variables,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
