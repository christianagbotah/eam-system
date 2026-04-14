import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

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

    const permit = await db.safetyPermit.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { id: true, fullName: true, username: true } },
        approvedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!permit) {
      return NextResponse.json(
        { success: false, error: 'Safety permit not found' },
        { status: 404 }
      );
    }

    // Note: SafetyPermit model has no plantId field — plant-scope IDOR check not applicable

    return NextResponse.json({ success: true, data: permit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load safety permit';
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
    if (!hasPermission(session, 'safety_permits.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.safetyPermit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Safety permit not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'description', 'type', 'status', 'location',
      'startDate', 'endDate', 'hazardAssessment', 'precautions', 'notes',
      'approvedById',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'startDate' || field === 'endDate') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else if (field === 'approvedById' && body[field]) {
          updateData[field] = body[field];
          updateData['approvedAt'] = new Date();
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.safetyPermit.update({
      where: { id },
      data: updateData,
      include: {
        requestedBy: { select: { id: true, fullName: true, username: true } },
        approvedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'safety_permit',
        entityId: id,
        oldValues: JSON.stringify({ permitNumber: existing.permitNumber, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update safety permit';
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

    const existing = await db.safetyPermit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Safety permit not found' },
        { status: 404 }
      );
    }

    await db.safetyPermit.delete({ where: { id } });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'safety_permit',
        entityId: id,
        oldValues: JSON.stringify({ permitNumber: existing.permitNumber }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete safety permit';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
