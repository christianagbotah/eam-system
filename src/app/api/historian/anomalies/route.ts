import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { anomalyPipelineService } from '@/services/historian/anomalyPipeline.service';

// GET /api/historian/anomalies — query anomaly history and summaries
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');

    // Summary view
    if (view === 'summary') {
      const summary = await anomalyPipelineService.getSummary();
      return NextResponse.json({ success: true, data: summary });
    }

    // Trend view for a specific source
    if (view === 'trend') {
      const sourceId = searchParams.get('sourceId');
      const days = parseInt(searchParams.get('days') || '30', 10);
      if (!sourceId) {
        return NextResponse.json({ success: false, error: 'sourceId is required for trend view' }, { status: 400 });
      }
      const trend = await anomalyPipelineService.getTrend(sourceId, days);
      return NextResponse.json({ success: true, data: trend });
    }

    // Config view
    if (view === 'configs') {
      const configs = await anomalyPipelineService.listConfigs();
      return NextResponse.json({ success: true, data: configs });
    }

    // Default: paginated anomaly history
    const query = {
      sourceId: searchParams.get('sourceId') || undefined,
      from: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
      to: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
      severity: (searchParams.get('severity') as 'low' | 'warning' | 'high' | 'critical') || undefined,
      confirmed: searchParams.get('confirmed') === 'true' ? true : searchParams.get('confirmed') === 'false' ? false : undefined,
      method: searchParams.get('method') || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    const result = await anomalyPipelineService.queryHistory(query);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to query anomalies';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/historian/anomalies — configure detection or run detection
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
    const { action } = body;

    // Configure anomaly detection
    if (action === 'configure') {
      const { sourceId, mappingId, method, windowSize, threshold, cooldownMinutes, confirmationCount, config } = body;

      const result = await anomalyPipelineService.upsertConfig({
        sourceId,
        mappingId,
        method,
        windowSize: windowSize ? parseInt(windowSize, 10) : undefined,
        threshold: threshold ? parseFloat(threshold) : undefined,
        cooldownMinutes: cooldownMinutes ? parseInt(cooldownMinutes, 10) : undefined,
        confirmationCount: confirmationCount ? parseInt(confirmationCount, 10) : undefined,
        config,
      });

      return NextResponse.json({ success: true, data: result });
    }

    // Run anomaly detection for a source
    if (action === 'detect') {
      const { sourceId, value, timestamp } = body;
      if (!sourceId || value === undefined) {
        return NextResponse.json({ success: false, error: 'sourceId and value are required' }, { status: 400 });
      }

      const result = await anomalyPipelineService.detect(
        sourceId,
        parseFloat(value),
        timestamp ? new Date(timestamp) : undefined,
      );

      return NextResponse.json({ success: true, data: result });
    }

    // Acknowledge an anomaly
    if (action === 'acknowledge') {
      const { anomalyId } = body;
      if (!anomalyId) {
        return NextResponse.json({ success: false, error: 'anomalyId is required' }, { status: 400 });
      }

      const result = await anomalyPipelineService.acknowledgeAnomaly(anomalyId, session.userId);
      return NextResponse.json({ success: true, data: result });
    }

    // Delete a config
    if (action === 'delete-config') {
      const { configId } = body;
      if (!configId) {
        return NextResponse.json({ success: false, error: 'configId is required' }, { status: 400 });
      }

      const result = await anomalyPipelineService.deleteConfig(configId);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Use: configure, detect, acknowledge, or delete-config' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process anomaly request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
