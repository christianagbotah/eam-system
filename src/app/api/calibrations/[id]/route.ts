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

    const record = await db.calibrationRecord.findUnique({ where: { id } });

    if (!record) {
      return NextResponse.json({ success: false, error: 'Calibration record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load calibration record';
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

    const existing = await db.calibrationRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Calibration record not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'description', 'instrumentName', 'serialNumber',
      'calibrationDate', 'nextDueDate', 'status', 'standardUsed',
      'result', 'asFound', 'asLeft', 'uncertainty', 'notes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'calibrationDate' || field === 'nextDueDate') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else if (field === 'asFound' || field === 'asLeft') {
          updateData[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]);
        } else if (field === 'uncertainty') {
          updateData[field] = body[field] ? parseFloat(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.calibrationRecord.update({ where: { id }, data: updateData });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'calibration',
        entityId: id,
        oldValues: JSON.stringify({ calibrationNumber: existing.calibrationNumber, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update calibration record';
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

    const { id } = await params;

    const existing = await db.calibrationRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Calibration record not found' }, { status: 404 });
    }

    await db.calibrationRecord.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'calibration',
        entityId: id,
        oldValues: JSON.stringify({ calibrationNumber: existing.calibrationNumber }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete calibration record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
