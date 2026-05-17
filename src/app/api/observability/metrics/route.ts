// ============================================================================
// API ROUTE — GET /api/observability/metrics — Prometheus text format metrics
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { PrometheusMetricsService } from '@/services/observability/prometheusMetrics.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'prometheus';

    // JSON format — returns structured metric data
    if (format === 'json') {
      const name = searchParams.get('name') || undefined;
      if (name) {
        const metric = PrometheusMetricsService.getMetric(name);
        if (!metric) {
          return NextResponse.json({ success: false, error: 'Metric not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: metric });
      }

      const list = PrometheusMetricsService.listMetrics();
      return NextResponse.json({ success: true, data: { metrics: list, total: list.length } });
    }

    // Prometheus text exposition format (default)
    const exposition = await PrometheusMetricsService.exposition();

    return new NextResponse(exposition, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to get metrics' }, { status: 500 });
  }
}
