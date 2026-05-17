import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { RCAGeneratorService } from '@/services/ai/rcaGenerator.service';

/**
 * GET /api/ai/rca/patterns — Get failure patterns summary
 *
 * Returns aggregated failure patterns with trends and suggested root causes.
 * Used for dashboards and reliability analytics.
 *
 * Query params:
 * - plantId (optional)
 * - months (optional, default 12) — lookback period in months
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get('plantId') || undefined;
    const months = parseInt(searchParams.get('months') || '12', 10);

    const patterns = await RCAGeneratorService.getFailurePatterns(plantId, months);

    return NextResponse.json({ success: true, data: patterns });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load failure patterns';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
