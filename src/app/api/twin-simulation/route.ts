import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { SimulationEngine } from '@/services/simulationEngine.service';

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { type, sourceId, duration, timeStep } = body;

    if (!type || !sourceId) {
      return NextResponse.json({ success: false, error: 'type and sourceId are required' }, { status: 400 });
    }

    let result;
    switch (type) {
      case 'flow':
        result = await SimulationEngine.runFlowSimulation(sourceId, duration || 60, timeStep || 1);
        break;
      case 'thermal':
        result = await SimulationEngine.runThermalSimulation(sourceId, duration || 60, timeStep || 1);
        break;
      case 'energy':
        result = await SimulationEngine.runEnergySimulation(sourceId, duration || 60, timeStep || 1);
        break;
      default:
        return NextResponse.json({ success: false, error: `Unknown simulation type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Simulation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
