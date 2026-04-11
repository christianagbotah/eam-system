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

    const inspection = await db.safetyInspection.findUnique({
      where: { id },
    });

    if (!inspection) {
      return NextResponse.json(
        { success: false, error: 'Safety inspection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: inspection });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load safety inspection';
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

    const existing = await db.safetyInspection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Safety inspection not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'description', 'type', 'status', 'scheduledDate', 'completedDate',
      'location', 'inspectorId', 'findings', 'score', 'maxScore', 'notes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'scheduledDate' || field === 'completedDate') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.safetyInspection.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'safety_inspection',
        entityId: id,
        oldValues: JSON.stringify({ inspectionNumber: existing.inspectionNumber, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update safety inspection';
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

    const existing = await db.safetyInspection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Safety inspection not found' },
        { status: 404 }
      );
    }

    await db.safetyInspection.delete({ where: { id } });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'safety_inspection',
        entityId: id,
        oldValues: JSON.stringify({ inspectionNumber: existing.inspectionNumber }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete safety inspection';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
