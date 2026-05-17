import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { handleApiError } from '@/lib/errors';
import { SlaService } from '@/services/workflow/sla.service';

// GET /api/workflow/sla/compliance — SLA compliance metrics
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();

    const metrics = await SlaService.getComplianceMetrics({
      entityType: searchParams.get('entityType') ?? undefined,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    return handleApiError(error);
  }
}
