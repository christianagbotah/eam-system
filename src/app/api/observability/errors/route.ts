import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { ObservabilityService } from '@/services/observability.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity') || undefined;
    const since = searchParams.get('since') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const errors = ObservabilityService.getErrors(severity, since, limit);

    return NextResponse.json({ success: true, data: { errors, total: errors.length } });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to get errors' }, { status: 500 });
  }
}
