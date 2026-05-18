// ============================================================================
// API ROUTE — GET /api/observability/traces — Query distributed & persisted traces
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { OpenTelemetryService } from '@/services/observability/openTelemetry.service';
import { queryHistoricalTraces, persistTraces } from '@/services/observability/persistence.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'search';

    // Persistence status / manual flush
    if (view === 'flush') {
      const result = await persistTraces();
      return NextResponse.json({ success: true, data: result });
    }

    // Historical (persisted) view — queries from database with tree structure
    if (view === 'historical') {
      const traceId = searchParams.get('traceId') || undefined;
      const serviceName = searchParams.get('serviceName') || undefined;
      const name = searchParams.get('name') || undefined;
      const minDurationMs = searchParams.get('minDurationMs') ? parseFloat(searchParams.get('minDurationMs')!) : undefined;
      const from = searchParams.get('from') || searchParams.get('since') || undefined;
      const to = searchParams.get('to') || searchParams.get('until') || undefined;
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      const result = await queryHistoricalTraces({
        traceId, serviceName, name, minDurationMs, from, to, limit, offset,
      });

      if (!result) {
        return NextResponse.json({ success: true, data: { traces: [], total: 0, limit, offset, hasMore: false } });
      }

      return NextResponse.json({ success: true, data: result });
    }

    // Default search view — queries from in-memory store
    const traceId = searchParams.get('traceId') || undefined;
    const serviceName = searchParams.get('serviceName') || undefined;
    const spanName = searchParams.get('spanName') || searchParams.get('name') || undefined;
    const minDurationMs = searchParams.get('minDurationMs') ? parseInt(searchParams.get('minDurationMs')!, 10) : undefined;
    const maxDurationMs = searchParams.get('maxDurationMs') ? parseInt(searchParams.get('maxDurationMs')!, 10) : undefined;
    const status = searchParams.get('status') as 'ok' | 'error' | 'unset' | undefined;
    const since = searchParams.get('since') || searchParams.get('from') || undefined;
    const until = searchParams.get('until') || searchParams.get('to') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // If a specific traceId is requested, return the full trace
    if (traceId) {
      const trace = OpenTelemetryService.getTrace(traceId);
      if (!trace) {
        return NextResponse.json({ success: false, error: 'Trace not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: { traceId, spans: trace, spanCount: trace.length } });
    }

    const result = OpenTelemetryService.queryTraces({
      serviceName, spanName, minDurationMs, maxDurationMs, status, since, until, limit,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to query traces' }, { status: 500 });
  }
}
