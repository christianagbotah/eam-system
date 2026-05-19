import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PredictiveEngine } from '@/services/predictiveEngine.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { assetId } = await params;
    const prediction = await PredictiveEngine.predictFailure(assetId);

    return NextResponse.json({ success: true, data: prediction });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Prediction failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
