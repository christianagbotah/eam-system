import { NextRequest, NextResponse } from 'next/server';
import { industrialTelemetryService } from '@/services/industrialTelemetry.service';
import { getSession } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';

// GET /api/telemetry/readings/historical — Get historical time-series data
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('mappingId');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const interval = searchParams.get('interval') || undefined;

    if (!mappingId) {
      return NextResponse.json(
        { success: false, error: 'mappingId is required' },
        { status: 400 }
      );
    }
    if (!startParam) {
      return NextResponse.json(
        { success: false, error: 'start date is required (ISO string)' },
        { status: 400 }
      );
    }
    if (!endParam) {
      return NextResponse.json(
        { success: false, error: 'end date is required (ISO string)' },
        { status: 400 }
      );
    }

    const start = new Date(startParam);
    const end = new Date(endParam);

    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid start date format' },
        { status: 400 }
      );
    }
    if (isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid end date format' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { success: false, error: 'start must be before end' },
        { status: 400 }
      );
    }

    // Limit range to 30 days
    const maxRange = 30 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > maxRange) {
      return NextResponse.json(
        { success: false, error: 'Date range cannot exceed 30 days' },
        { status: 400 }
      );
    }

    const result = await industrialTelemetryService.getHistoricalReadings(
      mappingId,
      start,
      end,
      interval
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
