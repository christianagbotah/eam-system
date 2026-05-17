import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { FieldIntelligenceService } from '@/services/fieldIntelligence.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lon = parseFloat(searchParams.get('lon') || '0');
    const radius = parseInt(searchParams.get('radius') || '500', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!lat || !lon) {
      return NextResponse.json({ success: false, error: 'lat and lon are required' }, { status: 400 });
    }

    const assets = await FieldIntelligenceService.findNearbyAssets(lat, lon, radius, limit);

    return NextResponse.json({ success: true, data: assets });
  } catch {
    return NextResponse.json({ success: false, error: 'Nearby asset search failed' }, { status: 500 });
  }
}
