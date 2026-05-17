import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { handleApiError } from '@/lib/errors';
import { WorkflowDesignerService } from '@/services/workflow/designer.service';

// GET /api/workflow/definitions/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth(_request);
    const { id } = await params;
    const definition = await WorkflowDesignerService.getDefinition(id);
    return NextResponse.json({ success: true, data: definition });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/workflow/definitions/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const updated = await WorkflowDesignerService.updateDefinition(id, {
      name: body.name,
      description: body.description,
      steps: body.steps,
      transitions: body.transitions,
      triggers: body.triggers,
      variablesSchema: body.variablesSchema,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/workflow/definitions/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth(_request);
    const { id } = await params;
    await WorkflowDesignerService.deleteDefinition(id);
    return NextResponse.json({ success: true, message: 'Definition deleted' });
  } catch (error) {
    return handleApiError(error);
  }
}
