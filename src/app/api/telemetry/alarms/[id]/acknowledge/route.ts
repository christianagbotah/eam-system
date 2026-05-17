import { NextRequest, NextResponse } from 'next/server';
import { industrialTelemetryService } from '@/services/industrialTelemetry.service';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';

// POST /api/telemetry/alarms/[id]/acknowledge — Acknowledge an active alarm
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'iot.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const alarm = await industrialTelemetryService.acknowledgeAlarm(id, session.userId);
    return NextResponse.json({ success: true, data: alarm });
  } catch (error) {
    return handleApiError(error);
  }
}
