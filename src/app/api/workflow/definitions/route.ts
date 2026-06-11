import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, parsePagination, parseSearch, paginatedResponse } from '@/lib/middleware';
import { hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';
import { WorkflowDesignerService } from '@/services/workflow/designer.service';

// GET /api/workflow/definitions — list definitions
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const result = await WorkflowDesignerService.listDefinitions({
      category: searchParams.get('category') ?? undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      search: searchParams.get('search') ?? undefined,
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

// POST /api/workflow/definitions — create definition
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!hasPermission(session, 'system_settings.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();

    const definition = await WorkflowDesignerService.createDefinition({
      name: body.name,
      key: body.key,
      category: body.category,
      description: body.description,
      steps: body.steps,
      transitions: body.transitions,
      triggers: body.triggers,
      variablesSchema: body.variablesSchema,
      createdById: session.userId,
    });

    return NextResponse.json({ success: true, data: definition }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
