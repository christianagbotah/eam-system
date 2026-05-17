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
    const health = await PredictiveEngine.calculateHealthScore(assetId);

    return NextResponse.json({ success: true, data: health });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Health calculation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
