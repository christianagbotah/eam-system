import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { advancedSimulationService, type SimulationDomain, type SimulationMode, type ScenarioType } from '@/services/simulation/advancedSimulation.service';

// POST /api/simulation/run — Execute a multi-physics simulation
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { domain, mode, scenario, assetId, twinId, parameters, duration, timeStep, networkNodes, networkEdges } = body;

    // Validate required fields
    if (!domain || !mode || !parameters) {
      return NextResponse.json(
        { success: false, error: 'domain, mode, and parameters are required' },
        { status: 400 },
      );
    }

    // Validate enums
    const validDomains: SimulationDomain[] = ['process_flow', 'thermal', 'vibration', 'energy', 'pressure_drop'];
    if (!validDomains.includes(domain)) {
      return NextResponse.json(
        { success: false, error: `Invalid domain. Must be one of: ${validDomains.join(', ')}` },
        { status: 400 },
      );
    }

    const validModes: SimulationMode[] = ['steady_state', 'transient'];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { success: false, error: `Invalid mode. Must be one of: ${validModes.join(', ')}` },
        { status: 400 },
      );
    }

    if (scenario) {
      const validScenarios: ScenarioType[] = ['what_if', 'worst_case', 'design_basis'];
      if (!validScenarios.includes(scenario)) {
        return NextResponse.json(
          { success: false, error: `Invalid scenario. Must be one of: ${validScenarios.join(', ')}` },
          { status: 400 },
        );
      }
    }

    // Execute simulation
    const result = await advancedSimulationService.runSimulation({
      domain,
      mode,
      scenario,
      assetId,
      twinId,
      parameters,
      duration,
      timeStep,
      networkNodes,
      networkEdges,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Simulation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
