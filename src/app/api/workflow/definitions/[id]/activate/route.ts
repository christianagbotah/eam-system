import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';
import { WorkflowDesignerService } from '@/services/workflow/designer.service';

// POST /api/workflow/definitions/[id]/activate — activate a definition
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth(_request);
    if (!hasPermission(session, 'system_settings.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    const activated = await WorkflowDesignerService.activateDefinition(id);
    return NextResponse.json({ success: true, data: activated });
  } catch (error) {
    return handleApiError(error);
  }
}
