import { NextRequest, NextResponse } from 'next/server';
import { industrialTelemetryService } from '@/services/industrialTelemetry.service';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';

// GET /api/telemetry/sources — List data sources with filters
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sourceType = searchParams.get('sourceType') || undefined;
    const status = searchParams.get('status') || undefined;
    const plantId = searchParams.get('plantId') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await industrialTelemetryService.listDataSources({
      page,
      limit,
      sourceType,
      status,
      plantId,
      search,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/telemetry/sources — Create a new data source
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
      sourceType,
      connectionConfig,
      plantId,
      metadata,
    } = body;

    const source = await industrialTelemetryService.createDataSource({
      name,
      sourceType,
      connectionConfig,
      plantId,
      metadata,
      createdById: session.userId,
    });

    return NextResponse.json({ success: true, data: source }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
