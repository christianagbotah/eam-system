import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { handleApiError } from '@/lib/errors';
import { WorkflowAnalyticsService } from '@/services/workflow/workflowAnalytics.service';

// GET /api/workflow/analytics — workflow analytics dashboard
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const definitionId = searchParams.get('definitionId') ?? undefined;
    const entityType = searchParams.get('entityType') ?? undefined;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    const summary = await WorkflowAnalyticsService.getFullAnalytics({
      definitionId,
      entityType,
      startDate,
      endDate,
    });

    // Include process paths if definitionId is specified
    if (definitionId) {
      const paths = await WorkflowAnalyticsService.getProcessPaths(definitionId);
      summary.processPaths = [paths];
    }

    // Include volume forecast if definitionId is specified
    if (definitionId) {
      const forecast = await WorkflowAnalyticsService.getVolumeForecast(definitionId);
      summary.volumeForecast = forecast;
    }

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    return handleApiError(error);
  }
}
