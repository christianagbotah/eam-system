import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';

// PATCH /api/telemetry/mappings/[id] — Update a mapping
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

    const existing = await db.telemetryMapping.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Mapping not found' }, { status: 404 });
    }

    const updatable = [
      'deviceId',
      'parameterName',
      'parameterUnit',
      'dataType',
      'scaleFactor',
      'offset',
      'deadband',
      'qualityRule',
      'isActve',
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of updatable) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    // Validate qualityRule if being updated
    if (data.qualityRule) {
      try {
        JSON.parse(data.qualityRule as string);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Quality rule must be valid JSON' },
          { status: 400 }
        );
      }
    }

    const mapping = await db.telemetryMapping.update({
      where: { id },
      data,
      include: {
        source: { select: { id: true, name: true, sourceType: true } },
        device: { select: { id: true, name: true, deviceCode: true } },
      },
    });

    return NextResponse.json({ success: true, data: mapping });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/telemetry/mappings/[id] — Delete a mapping
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

    const existing = await db.telemetryMapping.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Mapping not found' }, { status: 404 });
    }

    await db.telemetryMapping.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Mapping deleted' });
  } catch (error) {
    return handleApiError(error);
  }
}
