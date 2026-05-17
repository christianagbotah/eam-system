import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { TimeSeriesService } from '@/services/timeSeries.service';

// POST /api/time-series — write time-series data
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { points } = body;

    if (!Array.isArray(points) || points.length === 0) {
      return NextResponse.json({ success: false, error: 'Points array is required' }, { status: 400 });
    }

    const count = await TimeSeriesService.writeBatch(points);

    return NextResponse.json({ success: true, data: { written: count } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to write time-series data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// GET /api/time-series — query time-series data
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');
    if (!sourceId) {
      return NextResponse.json({ success: false, error: 'sourceId is required' }, { status: 400 });
    }

    const mode = searchParams.get('mode') || 'raw';

    const query = {
      sourceId,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      interval: searchParams.get('interval') || undefined,
      aggregation: (searchParams.get('aggregation') || 'avg') as 'avg' | 'min' | 'max' | 'sum' | 'count' | 'last',
      limit: parseInt(searchParams.get('limit') || '1000', 10),
    };

    if (mode === 'stats') {
      const stats = await TimeSeriesService.getStats(query.sourceId, query.from, query.to);
      return NextResponse.json({ success: true, data: stats });
    }

    if (mode === 'aggregate') {
      const data = await TimeSeriesService.aggregate(query);
      return NextResponse.json({ success: true, data });
    }

    if (mode === 'latest') {
      const data = await TimeSeriesService.readLatest(query.sourceId);
      return NextResponse.json({ success: true, data });
    }

    // Default: raw read
    const data = await TimeSeriesService.read(query);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read time-series data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
