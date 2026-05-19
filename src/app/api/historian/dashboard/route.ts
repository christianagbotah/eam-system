import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { historianDashboardService } from '@/services/historian/historianDashboard.service';

// GET /api/historian/dashboard — historian overview stats
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');

    // Full dashboard
    if (view === 'full' || !view) {
      const dashboard = await historianDashboardService.getDashboard();
      return NextResponse.json({ success: true, data: dashboard });
    }

    // Individual sections
    switch (view) {
      case 'tag-monitor': {
        const data = await historianDashboardService.getTagMonitorOverview();
        return NextResponse.json({ success: true, data });
      }
      case 'completeness': {
        const data = await historianDashboardService.getDataCompleteness();
        return NextResponse.json({ success: true, data });
      }
      case 'storage': {
        const data = await historianDashboardService.getStorageUtilization();
        return NextResponse.json({ success: true, data });
      }
      case 'ingestion': {
        const data = await historianDashboardService.getIngestionRates();
        return NextResponse.json({ success: true, data });
      }
      case 'top-consumers': {
        const data = await historianDashboardService.getTopConsumers();
        return NextResponse.json({ success: true, data });
      }
      case 'anomaly-summary': {
        const data = await historianDashboardService.getAnomalySummary();
        return NextResponse.json({ success: true, data });
      }
      case 'quality-scores': {
        const data = await historianDashboardService.getQualityScores();
        return NextResponse.json({ success: true, data });
      }
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown view: ${view}. Use: full, tag-monitor, completeness, storage, ingestion, top-consumers, anomaly-summary, quality-scores`,
        }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
