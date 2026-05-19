import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { aggregationPipelineService } from '@/services/historian/aggregationPipeline.service';

// POST /api/historian/aggregate — complex aggregation queries
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { operation } = body;

    // Multi-source aggregation
    if (operation === 'multi-source') {
      const { sourceIds, from, to, interval, gapFill, maxGapMinutes } = body;
      if (!sourceIds?.length || !from || !to) {
        return NextResponse.json({ success: false, error: 'sourceIds, from, and to are required' }, { status: 400 });
      }

      const result = await aggregationPipelineService.multiSourceAggregate({
        sourceIds,
        from: new Date(from),
        to: new Date(to),
        interval: interval || '1h',
        gapFill: gapFill || 'none',
        maxGapMinutes: maxGapMinutes ? parseInt(maxGapMinutes, 10) : 60,
      });

      return NextResponse.json({ success: true, data: result });
    }

    // Time-weighted average
    if (operation === 'twa') {
      const { sourceId, from, to } = body;
      if (!sourceId || !from || !to) {
        return NextResponse.json({ success: false, error: 'sourceId, from, and to are required' }, { status: 400 });
      }

      const result = await aggregationPipelineService.timeWeightedAverage({
        sourceId,
        from: new Date(from),
        to: new Date(to),
      });

      return NextResponse.json({ success: true, data: result });
    }

    // Rollup query
    if (operation === 'rollup') {
      const { sourceIds, from, to, rollupTo } = body;
      if (!sourceIds?.length || !from || !to) {
        return NextResponse.json({ success: false, error: 'sourceIds, from, and to are required' }, { status: 400 });
      }

      const result = await aggregationPipelineService.rollup({
        sourceIds,
        from: new Date(from),
        to: new Date(to),
        rollupTo: rollupTo || '1d',
      });

      return NextResponse.json({ success: true, data: result });
    }

    // Comparison query (current vs previous period)
    if (operation === 'compare') {
      const { sourceId, currentFrom, currentTo, lookbackPeriod } = body;
      if (!sourceId || !currentFrom || !currentTo) {
        return NextResponse.json({ success: false, error: 'sourceId, currentFrom, and currentTo are required' }, { status: 400 });
      }

      const result = await aggregationPipelineService.comparePeriods({
        sourceId,
        currentFrom: new Date(currentFrom),
        currentTo: new Date(currentTo),
        lookbackPeriod: lookbackPeriod || 'week',
      });

      return NextResponse.json({ success: true, data: result });
    }

    // Statistical summary
    if (operation === 'stats') {
      const { sourceIds, from, to } = body;
      if (!sourceIds?.length || !from || !to) {
        return NextResponse.json({ success: false, error: 'sourceIds, from, and to are required' }, { status: 400 });
      }

      const summaries = await aggregationPipelineService.batchSummaries(
        sourceIds,
        new Date(from),
        new Date(to),
      );

      return NextResponse.json({ success: true, data: summaries });
    }

    // Single source statistical summary
    if (operation === 'stats-single') {
      const { sourceId, from, to } = body;
      if (!sourceId || !from || !to) {
        return NextResponse.json({ success: false, error: 'sourceId, from, and to are required' }, { status: 400 });
      }

      const summary = await aggregationPipelineService.statisticalSummary(
        sourceId,
        new Date(from),
        new Date(to),
      );

      return NextResponse.json({ success: true, data: summary });
    }

    return NextResponse.json({
      success: false,
      error: `Invalid operation. Use: multi-source, twa, rollup, compare, stats, or stats-single`,
    }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to execute aggregation query';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
