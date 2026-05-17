import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { FacilityIntelligenceService } from '@/services/facilityIntelligence.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'assets.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    if (!query) {
      return NextResponse.json({ success: false, error: 'Search query (q) is required' }, { status: 400 });
    }

    const rootId = searchParams.get('rootId') || undefined;
    const results = await FacilityIntelligenceService.searchEquipment(query, rootId);

    return NextResponse.json({ success: true, data: results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to search';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
