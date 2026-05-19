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
    const fromId = searchParams.get('from');
    const toId = searchParams.get('to');

    if (!fromId || !toId) {
      return NextResponse.json({ success: false, error: 'from and to parameters are required' }, { status: 400 });
    }

    const result = await FacilityIntelligenceService.getNavigationPath(fromId, toId);

    if (!result) {
      return NextResponse.json({ success: false, error: 'Could not find navigation path' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get navigation path';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
