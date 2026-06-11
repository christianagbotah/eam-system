import { NextRequest, NextResponse } from 'next/server';
import { industrialPollingEngine } from '@/services/connectivity';
import { createLogger } from '@/lib/logger';
import { getSession, isAdmin } from '@/lib/auth';

const log = createLogger('API:ConnectivityConnect');

// POST /api/connectivity/sources/[id]/connect — Start/stop a data source connection
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, userId } = body; // action: 'start' | 'stop'

    if (action === 'start') {
      const instance = await industrialPollingEngine.startSource(id, userId || 'system');
      return NextResponse.json({ data: { sourceId: id, status: 'connected', message: 'Source connected successfully' }, });
    } else if (action === 'stop') {
      await industrialPollingEngine.stopSource(id);
      return NextResponse.json({ data: { sourceId: id, status: 'disconnected', message: 'Source disconnected' } });
    }

    return NextResponse.json({ error: 'Invalid action. Use "start" or "stop"' }, { status: 400 });
  } catch (error) {
    log.error('Failed to toggle connection', error as Error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to toggle connection' }, { status: 500 });
  }
}
