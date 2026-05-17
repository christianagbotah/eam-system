import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { failurePropagationService, type FailurePropagationRequest } from '@/services/simulation/failurePropagation.service';

// POST /api/simulation/failure-propagation — Analyze failure impact and cascade
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { assetId, failureMode, failureSeverity, plantId, includeDownstream, includeUpstream } = body;

    // Validate required fields
    if (!assetId || !failureMode || !failureSeverity) {
      return NextResponse.json(
        { success: false, error: 'assetId, failureMode, and failureSeverity are required' },
        { status: 400 },
      );
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(failureSeverity)) {
      return NextResponse.json(
        { success: false, error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` },
        { status: 400 },
      );
    }

    const validFailureModes = [
      'bearing_failure', 'seal_leak', 'motor_burnout', 'valve_stuck',
      'overheating', 'vibration_excess', 'corrosion_breakthrough',
      'electrical_fault', 'control_system_failure', 'structural_crack',
    ];

    const req: FailurePropagationRequest = {
      assetId,
      failureMode,
      failureSeverity,
      plantId,
      includeDownstream: includeDownstream ?? true,
      includeUpstream: includeUpstream ?? false,
    };

    const result = await failurePropagationService.analyzeFailure(req);

    return NextResponse.json({
      success: true,
      data: result,
      warnings: !validFailureModes.includes(failureMode)
        ? [`Unknown failure mode "${failureMode}". Using default impact profile. Known modes: ${validFailureModes.join(', ')}`]
        : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failure propagation analysis failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
