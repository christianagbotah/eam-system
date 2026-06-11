import { NextResponse } from 'next/server';
import { industrialPollingEngine } from '@/services/connectivity';
import { telemetryBatcher } from '@/services/connectivity';
import { eventStreamProcessor } from '@/services/connectivity';
import { edgeGatewayService } from '@/services/connectivity';
import { createLogger } from '@/lib/logger';
import { getSession, isAdmin } from '@/lib/auth';

const log = createLogger('API:ConnectivityEngine');

// GET /api/connectivity/engine — Get engine status, stats, all adapter statuses
export async function GET() {
  try {
    const [engineStats, adapterStatuses, batcherStats, eventStats, connectivityStats] = await Promise.all([
      industrialPollingEngine.getEngineStats(),
      industrialPollingEngine.getStatus(),
      telemetryBatcher.getStats(),
      eventStreamProcessor.getEventStats(),
      edgeGatewayService.getConnectivityStats(),
    ]);

    return NextResponse.json({
      engine: engineStats,
      adapters: adapterStatuses,
      batcher: batcherStats,
      eventStream: eventStats,
      connectivity: connectivityStats,
      timestamp: new Date(),
    });
  } catch (error) {
    log.error('Failed to get engine status', error as Error);
    return NextResponse.json({ error: 'Failed to get engine status' }, { status: 500 });
  }
}

// POST /api/connectivity/engine — Control the engine (stop all, flush, etc.)
export async function POST(request: Request) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'stop_all':
        await industrialPollingEngine.stopAll();
        return NextResponse.json({ message: 'All sources stopped' });
      case 'flush':
        await telemetryBatcher.flushAll();
        return NextResponse.json({ message: 'All batches flushed' });
      case 'sync_all': {
        const results = await edgeGatewayService.syncAllGateways();
        return NextResponse.json({ data: Object.fromEntries(results) });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    log.error('Engine control failed', error as Error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
