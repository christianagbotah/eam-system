import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { FieldIntelligenceService } from '@/services/fieldIntelligence.service';

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { startLat, startLon, assetIds } = body;

    if (!startLat || !startLon || !Array.isArray(assetIds)) {
      return NextResponse.json({ success: false, error: 'startLat, startLon, and assetIds required' }, { status: 400 });
    }

    const route = FieldIntelligenceService.optimizeRoute(startLat, startLon, assetIds);

    return NextResponse.json({ success: true, data: route });
  } catch {
    return NextResponse.json({ success: false, error: 'Route optimization failed' }, { status: 500 });
  }
}
