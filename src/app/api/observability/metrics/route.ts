import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { ObservabilityService } from '@/services/observability.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name') || undefined;
    const since = searchParams.get('since') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const metrics = ObservabilityService.getMetrics(name, since, limit);

    return NextResponse.json({ success: true, data: { metrics, total: metrics.length } });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to get metrics' }, { status: 500 });
  }
}
