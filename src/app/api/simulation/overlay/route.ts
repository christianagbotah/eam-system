import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { processOverlayService } from '@/services/simulation/processOverlay.service';

// GET /api/simulation/overlay — Get live telemetry overlay data for a digital twin
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const twinId = searchParams.get('twinId');
    const mode = searchParams.get('mode') ?? 'full'; // 'full' or 'status-only'

    if (!twinId) {
      return NextResponse.json(
        { success: false, error: 'twinId is required' },
        { status: 400 },
      );
    }

    if (mode === 'status-only') {
      // Lightweight status-only response for polling
      const statusData = await processOverlayService.generateStatusOnly(twinId);
      return NextResponse.json({ success: true, data: statusData });
    }

    // Full overlay data
    const overlayData = await processOverlayService.generateOverlay(twinId);
    return NextResponse.json({ success: true, data: overlayData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate overlay data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
