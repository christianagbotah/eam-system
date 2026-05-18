// ============================================================================
// API ROUTE — GET /api/observability/logs — Search centralized & persisted logs
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { CentralizedLoggingService } from '@/services/observability/centralizedLogging.service';
import type { LogLevel } from '@/services/observability/centralizedLogging.service';
import { queryHistoricalLogs, persistLogs, getStatus } from '@/services/observability/persistence.service';

const VALID_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'search';

    // Stats view — returns log statistics
    if (view === 'stats') {
      const hours = parseInt(searchParams.get('hours') || '24', 10);
      const stats = CentralizedLoggingService.getStats(hours);
      return NextResponse.json({ success: true, data: stats });
    }

    // Anomalies view
    if (view === 'anomalies') {
      const anomalies = CentralizedLoggingService.getAnomalies();
      return NextResponse.json({ success: true, data: { anomalies, total: anomalies.length } });
    }

    // Persistence status view
    if (view === 'persistence') {
      const status = getStatus();
      return NextResponse.json({ success: true, data: status });
    }

    // Log level management
    if (view === 'level') {
      const minLevel = CentralizedLoggingService.getMinLevel();
      return NextResponse.json({ success: true, data: { minLevel } });
    }

    // Historical (persisted) view — queries from database
    if (view === 'historical') {
      const level = searchParams.get('level') || undefined;
      const service = searchParams.get('service') || undefined;
      const traceId = searchParams.get('traceId') || undefined;
      const correlationId = searchParams.get('correlationId') || undefined;
      const userId = searchParams.get('userId') || undefined;
      const search = searchParams.get('q') || searchParams.get('search') || undefined;
      const from = searchParams.get('from') || searchParams.get('since') || undefined;
      const to = searchParams.get('to') || searchParams.get('until') || undefined;
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      if (level && !VALID_LEVELS.includes(level)) {
        return NextResponse.json({ success: false, error: `Invalid log level: ${level}` }, { status: 400 });
      }

      const result = await queryHistoricalLogs({
        level, service, traceId, correlationId, userId, search, from, to, limit, offset,
      });

      if (!result) {
        return NextResponse.json({ success: true, data: { logs: [], total: 0, limit, offset, hasMore: false, summary: { byLevel: {}, topServices: [] } } });
      }

      return NextResponse.json({ success: true, data: result });
    }

    // Manual flush trigger
    if (view === 'flush') {
      const result = await persistLogs();
      return NextResponse.json({ success: true, data: result });
    }

    // Search view (default) — queries from in-memory buffer
    const level = searchParams.get('level') as LogLevel | undefined;
    const service = searchParams.get('service') || undefined;
    const traceId = searchParams.get('traceId') || undefined;
    const correlationId = searchParams.get('correlationId') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const requestId = searchParams.get('requestId') || undefined;
    const context = searchParams.get('context') || undefined;
    const messagePattern = searchParams.get('q') || searchParams.get('messagePattern') || undefined;
    const since = searchParams.get('since') || undefined;
    const until = searchParams.get('until') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (level && !VALID_LEVELS.includes(level)) {
      return NextResponse.json({ success: false, error: `Invalid log level: ${level}. Must be one of: ${VALID_LEVELS.join(', ')}` }, { status: 400 });
    }

    const result = CentralizedLoggingService.search({
      level: level as LogLevel,
      service, traceId, correlationId, userId, requestId, context, messagePattern, since, until, limit, offset,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to search logs' }, { status: 500 });
  }
}
