// ============================================================================
// API ROUTE — GET /api/observability/traces — Query distributed traces
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { OpenTelemetryService } from '@/services/observability/openTelemetry.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const traceId = searchParams.get('traceId') || undefined;
    const serviceName = searchParams.get('serviceName') || undefined;
    const spanName = searchParams.get('spanName') || undefined;
    const minDurationMs = searchParams.get('minDurationMs') ? parseInt(searchParams.get('minDurationMs')!, 10) : undefined;
    const maxDurationMs = searchParams.get('maxDurationMs') ? parseInt(searchParams.get('maxDurationMs')!, 10) : undefined;
    const status = searchParams.get('status') as 'ok' | 'error' | 'unset' | undefined;
    const since = searchParams.get('since') || undefined;
    const until = searchParams.get('until') || undefined;
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
