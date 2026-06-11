import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { productionImpactService, type ProductionImpactRequest } from '@/services/simulation/productionImpact.service';

// POST /api/simulation/production-impact — Analyze production impact
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'system_settings.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { assetIds, scenario, duration, productionRate, unitValue, operatingHours, includeEnergyAnalysis } = body;

    // Validate required fields
    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'assetIds is required and must be a non-empty array' },
        { status: 400 },
      );
    }

    const validScenarios = ['single_failure', 'multiple_failure', 'degradation', 'maintenance_planning'];
    if (scenario && !validScenarios.includes(scenario)) {
      return NextResponse.json(
        { success: false, error: `Invalid scenario. Must be one of: ${validScenarios.join(', ')}` },
        { status: 400 },
      );
    }

    const req: ProductionImpactRequest = {
      assetIds,
      scenario: scenario ?? 'single_failure',
      duration,
      productionRate,
      unitValue,
      operatingHours,
      includeEnergyAnalysis: includeEnergyAnalysis ?? false,
    };

    const result = await productionImpactService.analyzeProduction(req);

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Production impact analysis failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
