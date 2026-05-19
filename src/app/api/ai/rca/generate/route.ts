import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { RCAGeneratorService } from '@/services/ai/rcaGenerator.service';

/**
 * POST /api/ai/rca/generate — Generate a Root Cause Analysis for a failure
 *
 * Accepts failure data and generates a comprehensive RCA report including:
 * - 5-Why analysis
 * - Fishbone diagram data
 * - Fault tree
 * - Failure correlations
 * - Temporal patterns
 * - Equipment interactions
 * - Corrective actions
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      failureRecordId,
      assetId,
      workOrderId,
      failureDescription,
      failureMode,
      failureDate,
      consequences,
      includeHistoricalAnalysis,
    } = body;

    if (!failureDescription && !failureRecordId) {
      return NextResponse.json(
        { success: false, error: 'failureDescription or failureRecordId is required' },
        { status: 400 },
      );
    }

    const report = await RCAGeneratorService.generateRCA({
      failureRecordId,
      assetId,
      workOrderId,
      failureDescription,
      failureMode,
      failureDate,
      consequences,
      includeHistoricalAnalysis,
    });

    return NextResponse.json({ success: true, data: report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'RCA generation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
