import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { TimeSeriesService } from '@/services/timeSeries.service';

// GET /api/time-series/sources — list data sources
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const sources = await TimeSeriesService.listSources(limit);

    return NextResponse.json({ success: true, data: sources });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to list sources' }, { status: 500 });
  }
}
