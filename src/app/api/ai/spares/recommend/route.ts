import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { SparePartsAIService } from '@/services/ai/sparePartsAI.service';

/**
 * POST /api/ai/spares/recommend — Get spare parts intelligence recommendations
 *
 * Returns comprehensive spare parts recommendations:
 * - Critical spare identification
 * - Obsolescence risk detection
 * - Substitute part suggestions
 * - Optimal stock level calculations (EOQ)
 * - Supplier risk assessments
 * - Cost optimization opportunities
 * - Parts standardization recommendations
 *
 * Body params:
 * - plantId (optional)
 * - category (optional)
 * - assessObsolescence (optional, default true)
 * - suggestSubstitutes (optional, default true)
 * - optimizeCosts (optional, default true)
 * - standardize (optional, default true)
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      plantId,
      category,
      assessObsolescence,
      suggestSubstitutes,
      optimizeCosts,
      standardize,
    } = body || {};

    const recommendations = await SparePartsAIService.getRecommendations({
      plantId,
      category,
      assessObsolescence,
      suggestSubstitutes,
      optimizeCosts,
      standardize,
    });

    return NextResponse.json({ success: true, data: recommendations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Spare parts recommendations failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
