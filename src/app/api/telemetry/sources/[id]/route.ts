import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { industrialTelemetryService } from '@/services/industrialTelemetry.service';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';

// GET /api/telemetry/sources/[id] — Get single data source
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const source = await db.telemetryDataSource.findUnique({
      where: { id },
      include: {
        plant: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, fullName: true } },
        mappings: {
          include: {
            device: { select: { id: true, name: true, deviceCode: true } },
            _count: { select: { streams: true, alarmRules: true } },
          },
          orderBy: { parameterName: 'asc' },
        },
        _count: { select: { streams: true } },
      },
    });

    if (!source) {
      return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: source });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/telemetry/sources/[id] — Update data source
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'iot_devices.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.telemetryDataSource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
    }

    const updatable = [
      'name',
      'sourceType',
      'connectionConfig',
      'plantId',
      'lastError',
      'metadata',
      'isActive',
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of updatable) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    // If status is being updated, handle via service
    if (body.status) {
      const updated = await industrialTelemetryService.updateDataSourceStatus(
        id,
        body.status,
        body.lastError
      );
      return NextResponse.json({ success: true, data: updated });
    }

    // Validate connectionConfig if being updated
    if (data.connectionConfig) {
      try {
        JSON.parse(data.connectionConfig as string);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Connection config must be valid JSON' },
          { status: 400 }
        );
      }
    }

    const source = await db.telemetryDataSource.update({
      where: { id },
      data,
      include: {
        plant: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ success: true, data: source });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/telemetry/sources/[id] — Soft-delete data source
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'iot_devices.delete') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const result = await industrialTelemetryService.deleteDataSource(id);
    return NextResponse.json({ ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
