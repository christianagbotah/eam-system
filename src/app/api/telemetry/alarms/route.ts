import { NextRequest, NextResponse } from 'next/server';
import { industrialTelemetryService } from '@/services/industrialTelemetry.service';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';

// GET /api/telemetry/alarms — Get active alarms (optionally by severity)
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity') || undefined;

    const result = await industrialTelemetryService.getActiveAlarms(severity);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/telemetry/alarms — Create an alarm rule
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'iot.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      mappingId,
      condition,
      severity,
      cooldownMinutes,
      escalationPath,
      notification,
    } = body;

    const rule = await industrialTelemetryService.createAlarmRule({
      name,
      mappingId,
      condition,
      severity,
      cooldownMinutes,
      escalationPath,
      notification,
      createdById: session.userId,
    });

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
