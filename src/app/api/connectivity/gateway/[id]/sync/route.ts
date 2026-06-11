import { NextRequest, NextResponse } from 'next/server';
import { edgeGatewayService } from '@/services/connectivity';
import { createLogger } from '@/lib/logger';
import { getSession, isAdmin } from '@/lib/auth';

const log = createLogger('API:GatewaySync');

// POST /api/connectivity/gateway/[id]/sync — Trigger sync
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
    const result = await edgeGatewayService.syncGateway(id);
    return NextResponse.json({ data: result });
  } catch (error) {
    log.error('Failed to sync gateway', error as Error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
