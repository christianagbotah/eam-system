import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { downsamplingService } from '@/services/historian/downsampling.service';

// POST /api/historian/downsample — trigger downsampling job
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { sourceIds, sourceId } = body;

    // Single source or all sources
    let result;
    if (sourceId) {
      const tierResults = await downsamplingService.downsampleSourceAllTiers(sourceId);
      result = {
        sourceId,
        tiers: tierResults,
        totalBuckets: tierResults.reduce((s, r) => s + r.bucketsProcessed, 0),
        totalReadingsAggregated: tierResults.reduce((s, r) => s + r.readingsAggregated, 0),
      };
    } else {
      const targets = sourceIds as string[] | undefined;
      result = await downsamplingService.runDownsamplingJob(targets);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to execute downsampling';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// GET /api/historian/downsample — get downsampling status and policies
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');

    if (sourceId) {
      const status = await downsamplingService.getSourceStatus(sourceId);
      const tiers = await downsamplingService.queryDownsampled(
        sourceId,
        searchParams.get('interval') || '1h',
        new Date(searchParams.get('from') || new Date(Date.now() - 86400000).toISOString()),
        new Date(searchParams.get('to') || new Date().toISOString()),
        parseInt(searchParams.get('limit') || '100', 10),
      );
      return NextResponse.json({ success: true, data: { status, tiers } });
    }

    // Return policies and available tiers
    const [policies, tiers] = await Promise.all([
      downsamplingService.listPolicies(),
      Promise.resolve(downsamplingService.getTiers()),
    ]);

    return NextResponse.json({ success: true, data: { policies, tiers } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch downsampling data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
