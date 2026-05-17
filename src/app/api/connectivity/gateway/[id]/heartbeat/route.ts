import { NextRequest, NextResponse } from 'next/server';
import { edgeGatewayService } from '@/services/connectivity';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:GatewayHeartbeat');

// POST /api/connectivity/gateway/[id]/heartbeat
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    await edgeGatewayService.processHeartbeat(id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Failed to process heartbeat', error as Error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
