// ============================================================================
// API ROUTE — GET /api/observability/logs — Search centralized logs
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { CentralizedLoggingService } from '@/services/observability/centralizedLogging.service';
import type { LogLevel } from '@/services/observability/centralizedLogging.service';

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

    // Log level management
    if (view === 'level') {
      if (request.method === 'GET') {
        const minLevel = CentralizedLoggingService.getMinLevel();
        return NextResponse.json({ success: true, data: { minLevel } });
      }
    }

    // Search view (default)
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
