import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, parsePagination, paginatedResponse } from '@/lib/middleware';
import { hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';
import { WorkflowEngineService } from '@/services/workflow/engine.service';

// GET /api/workflow/instances — list instances
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePagination(searchParams);

    const result = await WorkflowEngineService.listInstances({
      status: (searchParams.get('status') as 'pending' | 'running' | 'suspended' | 'completed' | 'cancelled' | 'failed') ?? undefined,
      entityType: searchParams.get('entityType') ?? undefined,
      entityId: searchParams.get('entityId') ?? undefined,
      definitionId: searchParams.get('definitionId') ?? undefined,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...paginatedResponse(result.data, result.total, page, limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/workflow/instances — start a workflow
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!hasPermission(session, 'system_settings.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();

    const instance = await WorkflowEngineService.startWorkflow({
      definitionId: body.definitionId,
      entityType: body.entityType,
      entityId: body.entityId,
      variables: body.variables,
      startedById: session.userId,
    });

    return NextResponse.json({ success: true, data: instance }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
