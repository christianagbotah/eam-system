import { NextRequest, NextResponse } from 'next/server';
import { industrialTelemetryService } from '@/services/industrialTelemetry.service';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';

// POST /api/telemetry/readings — Ingest a telemetry reading
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { mappingId, value, quality, timestamp, metadata } = body;

    if (!mappingId) {
      return NextResponse.json(
        { success: false, error: 'mappingId is required' },
        { status: 400 }
      );
    }
    if (value === undefined || value === null) {
      return NextResponse.json(
        { success: false, error: 'value is required' },
        { status: 400 }
      );
    }

    const result = await industrialTelemetryService.ingestReading({
      mappingId,
      value: Number(value),
      quality: quality !== undefined ? Number(quality) : undefined,
      timestamp: timestamp ? new Date(timestamp) : undefined,
      metadata,
    });

    if (result.skipped) {
      return NextResponse.json({ success: true, skipped: true, reason: result.reason });
    }

    return NextResponse.json({ success: true, data: result.data, isAnomaly: result.isAnomaly });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/telemetry/readings — Get latest readings by mappingIds
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mappingIdsParam = searchParams.get('mappingIds');

    if (!mappingIdsParam) {
      return NextResponse.json(
        { success: false, error: 'mappingIds query parameter is required (comma-separated)' },
        { status: 400 }
      );
    }

    const mappingIds = mappingIdsParam.split(',').filter(Boolean);
    if (mappingIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one mappingId is required' },
        { status: 400 }
      );
    }

    if (mappingIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 mappingIds per request' },
        { status: 400 }
      );
    }

    const readings = await industrialTelemetryService.getLatestReadings(mappingIds);
    return NextResponse.json({ success: true, data: readings });
  } catch (error) {
    return handleApiError(error);
  }
}
