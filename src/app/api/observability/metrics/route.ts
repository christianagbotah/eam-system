// ============================================================================
// API ROUTE — GET /api/observability/metrics — Prometheus text format metrics
//
// UNAUTHENTICATED — Prometheus scrapers require open access.
// Supports ?XTransformPort= query param for gateway routing.
// Supports ?format=json for structured metric data.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { PrometheusMetricsService } from '@/services/observability/prometheusMetrics.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'prometheus';

    // JSON format — returns structured metric data (also unauthenticated)
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
    // Auto-collects process metrics (memory, uptime, cache stats) on each scrape
    const exposition = await PrometheusMetricsService.exposition();

    return new NextResponse(exposition, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Prometheus-Scrape-Format': 'text',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to get metrics' }, { status: 500 });
  }
}
