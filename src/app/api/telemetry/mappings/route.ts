import { NextRequest, NextResponse } from 'next/server';
import { industrialTelemetryService } from '@/services/industrialTelemetry.service';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';

// GET /api/telemetry/mappings — List mappings (requires sourceId)
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');

    if (!sourceId) {
      return NextResponse.json(
        { success: false, error: 'sourceId query parameter is required' },
        { status: 400 }
      );
    }

    const mappings = await industrialTelemetryService.listMappings(sourceId);
    return NextResponse.json({ success: true, data: mappings });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/telemetry/mappings — Create a new telemetry mapping
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'iot_devices.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      sourceId,
      deviceId,
      externalId,
      parameterName,
      parameterUnit,
      dataType,
      scaleFactor,
      offset,
      deadband,
      qualityRule,
    } = body;

    const mapping = await industrialTelemetryService.createMapping({
      sourceId,
      deviceId,
      externalId,
      parameterName,
      parameterUnit,
      dataType,
      scaleFactor,
      offset,
      deadband,
      qualityRule,
      createdById: session.userId,
    });

    return NextResponse.json({ success: true, data: mapping }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
