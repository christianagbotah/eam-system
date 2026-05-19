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
    const plantId = searchParams.get('plantId') || undefined;

    const insights = await PredictiveEngine.getInsightsDashboard(plantId);

    return NextResponse.json({ success: true, data: insights });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get insights';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
