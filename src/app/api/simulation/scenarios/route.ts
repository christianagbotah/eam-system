import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { advancedSimulationService, type SimulationDomain, type SimulationScenario } from '@/services/simulation/advancedSimulation.service';

// GET /api/simulation/scenarios — List scenario presets for a domain
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain') as SimulationDomain | null;

    if (!domain) {
      // Return all scenarios grouped by domain
      const allDomains: SimulationDomain[] = ['process_flow', 'thermal', 'vibration', 'energy', 'pressure_drop'];
      const allScenarios: Record<string, SimulationScenario[]> = {};
      for (const d of allDomains) {
        allScenarios[d] = advancedSimulationService.getScenarioPresets(d);
      }
      return NextResponse.json({ success: true, data: { domains: allDomains, scenarios: allScenarios } });
    }

    const validDomains: SimulationDomain[] = ['process_flow', 'thermal', 'vibration', 'energy', 'pressure_drop'];
    if (!validDomains.includes(domain)) {
      return NextResponse.json(
        { success: false, error: `Invalid domain. Must be one of: ${validDomains.join(', ')}` },
        { status: 400 },
      );
    }

    const scenarios = advancedSimulationService.getScenarioPresets(domain);
    return NextResponse.json({ success: true, data: { domain, scenarios } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch scenarios';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/simulation/scenarios — Run a scenario comparison (base + scenario)
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
    const { domain, mode, assetId, twinId, baseParameters, overrideParameters, scenarioType } = body;

    if (!domain || !mode || !baseParameters || !overrideParameters) {
      return NextResponse.json(
        { success: false, error: 'domain, mode, baseParameters, and overrideParameters are required' },
        { status: 400 },
      );
    }

    const validDomains: SimulationDomain[] = ['process_flow', 'thermal', 'vibration', 'energy', 'pressure_drop'];
    if (!validDomains.includes(domain)) {
      return NextResponse.json(
        { success: false, error: `Invalid domain: ${domain}` },
        { status: 400 },
      );
    }

    const result = await advancedSimulationService.runScenario(
      {
        domain,
        mode,
        scenario: scenarioType,
        assetId,
        twinId,
        parameters: baseParameters,
        duration: body.duration,
        timeStep: body.timeStep,
      },
      overrideParameters,
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Scenario execution failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
