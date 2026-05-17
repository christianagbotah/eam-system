import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { handleApiError } from '@/lib/errors';
import { WorkflowDesignerService } from '@/services/workflow/designer.service';

// POST /api/workflow/definitions/[id]/activate — activate a definition
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth(_request);
    const { id } = await params;
    const activated = await WorkflowDesignerService.activateDefinition(id);
    return NextResponse.json({ success: true, data: activated });
  } catch (error) {
    return handleApiError(error);
  }
}
