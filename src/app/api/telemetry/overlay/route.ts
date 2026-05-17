import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { DiagramTelemetryService } from '@/services/diagramTelemetry.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const diagramId = searchParams.get('diagramId');

    if (!diagramId) {
      return NextResponse.json({ success: false, error: 'diagramId is required' }, { status: 400 });
    }

    // Build overlay config
    const config = await DiagramTelemetryService.buildOverlayConfig(diagramId);
    if (!config) {
      return NextResponse.json({ success: false, error: 'Diagram not found' }, { status: 404 });
    }

    // Fetch latest telemetry for all sources
    const snapshots = await DiagramTelemetryService.fetchSnapshots(config.sources);

    // Get alarm status
    const alarms = await DiagramTelemetryService.getAlarmStatus(diagramId);

    return NextResponse.json({
      success: true,
      data: {
        config,
        snapshots,
        alarms,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch telemetry overlay';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
