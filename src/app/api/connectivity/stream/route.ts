import { NextRequest, NextResponse } from 'next/server';
import { eventStreamProcessor } from '@/services/connectivity';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:ConnectivityStream');

// GET /api/connectivity/stream — Query event stream history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const events = await eventStreamProcessor.queryEvents({
      eventType: searchParams.get('eventType') || undefined,
      severity: (searchParams.get('severity') as 'info' | 'warning' | 'error' | 'critical') || undefined,
      sourceId: searchParams.get('sourceId') || undefined,
      startTime: searchParams.get('startTime') ? new Date(searchParams.get('startTime')!) : undefined,
      endTime: searchParams.get('endTime') ? new Date(searchParams.get('endTime')!) : undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
    });
    return NextResponse.json({ data: events });
  } catch (error) {
    log.error('Failed to query event stream', error as Error);
    return NextResponse.json({ error: 'Failed to query event stream' }, { status: 500 });
  }
}
