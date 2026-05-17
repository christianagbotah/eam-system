import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PredictiveEngine } from '@/services/predictiveEngine.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');
    const lookbackHours = parseInt(searchParams.get('hours') || '24', 10);

    if (!sourceId) {
      return NextResponse.json({ success: false, error: 'sourceId is required' }, { status: 400 });
    }

    const anomalies = await PredictiveEngine.detectAnomalies(sourceId, lookbackHours);

    return NextResponse.json({ success: true, data: { sourceId, anomalies, count: anomalies.length } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Anomaly detection failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
