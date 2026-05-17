import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { SparePartsAIService } from '@/services/ai/sparePartsAI.service';

/**
 * GET /api/ai/spares/forecast — Demand forecast for spare parts
 *
 * Returns consumption-based demand forecasts with:
 * - Predicted demand for the forecast period
 * - Confidence intervals
 * - Trend and seasonality analysis
 * - Reorder point and quantity recommendations
 * - Stockout risk assessment
 *
 * Query params:
 * - plantId (optional)
 * - category (optional)
 * - forecastDays (optional, default 90)
 * - includeConfidenceIntervals (optional, default true)
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get('plantId') || undefined;
    const category = searchParams.get('category') || undefined;
    const forecastDays = parseInt(searchParams.get('forecastDays') || '90', 10);
    const includeConfidenceIntervals = searchParams.get('includeConfidenceIntervals') !== 'false';

    const forecasts = await SparePartsAIService.forecastDemand({
      plantId,
      category,
      forecastDays,
      includeConfidenceIntervals,
    });

    return NextResponse.json({
      success: true,
      data: forecasts,
      meta: { totalParts: forecasts.length, forecastDays },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Demand forecast failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
