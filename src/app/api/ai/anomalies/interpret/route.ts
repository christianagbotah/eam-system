import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { AnomalyInterpreterService } from '@/services/ai/anomalyInterpreter.service';

/**
 * POST /api/ai/anomalies/interpret — Interpret detected anomalies
 *
 * Accepts a batch of raw anomaly detections and returns:
 * - Severity classification per anomaly
 * - Root cause hypotheses with probability scoring
 * - Trend analysis (worsening/stable/improving)
 * - Correlated anomaly groups
 * - Recommended responses (immediate/short-term/long-term)
 * - Work order recommendations
 * - Equipment health narratives
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'assets.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { anomalies, plantId, includeHistory, generateWorkOrders } = body;

    if (!anomalies || !Array.isArray(anomalies) || anomalies.length === 0) {
      return NextResponse.json(
        { success: false, error: 'anomalies array is required and must not be empty' },
        { status: 400 },
      );
    }

    // Validate anomaly structure
    for (let i = 0; i < anomalies.length; i++) {
      const a = anomalies[i];
      if (!a.sourceId || !a.parameterName || typeof a.value !== 'number') {
        return NextResponse.json(
          { success: false, error: `Invalid anomaly at index ${i}: sourceId, parameterName, and value (number) are required` },
          { status: 400 },
        );
      }
    }

    const result = await AnomalyInterpreterService.interpretAnomalies({
      anomalies,
      plantId,
      includeHistory,
      generateWorkOrders,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Anomaly interpretation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
