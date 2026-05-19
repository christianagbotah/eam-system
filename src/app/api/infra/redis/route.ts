import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync, isAdmin } from '@/lib/auth';
import { getRedisClient, getRedisInfo } from '@/lib/redis';

export const dynamic = 'force-dynamic';

// GET /api/infra/redis — Redis status and health check
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const session = await getSessionAsync(token);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const client = getRedisClient();
    const isHealthy = await client.ping();
    const info = getRedisInfo();

    return NextResponse.json({
      success: true,
      data: {
        type: info.type,
        available: info.available,
        healthy: isHealthy,
        url: info.url,
        capabilities: [
          'get', 'set', 'del', 'delByPrefix', 'exists',
          'keys', 'incr', 'expire', 'publish', 'on', 'ping',
        ],
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check Redis status';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
