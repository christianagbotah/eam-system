import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

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

    const reading = await db.meterReading.findUnique({
      where: { id },
      include: {
        readBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!reading) {
      return NextResponse.json({ success: false, error: 'Meter reading not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: reading });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load meter reading';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.meterReading.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Meter reading not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = ['meterName', 'value', 'unit', 'readingDate', 'notes'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'value') {
          updateData[field] = Number(body[field]);
        } else if (field === 'readingDate') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.meterReading.update({
      where: { id },
      data: updateData,
      include: {
        readBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'meter_reading',
        entityId: id,
        oldValues: JSON.stringify({ readingNumber: existing.readingNumber, value: existing.value }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update meter reading';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.meterReading.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Meter reading not found' }, { status: 404 });
    }

    await db.meterReading.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'meter_reading',
        entityId: id,
        oldValues: JSON.stringify({ readingNumber: existing.readingNumber }),
      },
    });

    return NextResponse.json({ success: true, message: 'Meter reading deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete meter reading';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
