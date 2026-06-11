import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';
import { SlaService } from '@/services/workflow/sla.service';

// GET /api/workflow/sla — list SLA policies
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const policies = await SlaService.listPolicies({
      entityType: searchParams.get('entityType') ?? undefined,
      priority: searchParams.get('priority') ?? undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
    });

    return NextResponse.json({ success: true, data: policies });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/workflow/sla — create SLA policy
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!hasPermission(session, 'system_settings.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();

    const policy = await SlaService.createPolicy({
      name: body.name,
      entityType: body.entityType,
      priority: body.priority,
      responseMinutes: body.responseMinutes,
      resolutionMinutes: body.resolutionMinutes,
      escalationRules: body.escalationRules,
      businessHoursOnly: body.businessHoursOnly,
      warningPercent: body.warningPercent,
      createdById: session.userId,
    });

    return NextResponse.json({ success: true, data: policy }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
