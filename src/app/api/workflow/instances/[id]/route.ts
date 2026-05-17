import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { handleApiError } from '@/lib/errors';
import { WorkflowEngineService } from '@/services/workflow/engine.service';

// GET /api/workflow/instances/[id] — get instance with step history
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth(_request);
    const { id } = await params;
    const instance = await WorkflowEngineService.getInstance(id);
    return NextResponse.json({ success: true, data: instance });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/workflow/instances/[id] — suspend / resume / cancel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const action = body.action as string;

    let result;
    switch (action) {
      case 'suspend':
        result = await WorkflowEngineService.suspendWorkflow(id, session.userId, body.reason);
        break;
      case 'resume':
        result = await WorkflowEngineService.resumeWorkflow(id, session.userId);
        break;
      case 'cancel':
        result = await WorkflowEngineService.cancelWorkflow(id, session.userId, body.reason);
        break;
      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
