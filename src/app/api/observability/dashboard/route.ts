import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { ObservabilityService } from '@/services/observability.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const dashboard = await ObservabilityService.getDashboard();

    return NextResponse.json({ success: true, data: dashboard });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Dashboard failed' }, { status: 500 });
  }
}
