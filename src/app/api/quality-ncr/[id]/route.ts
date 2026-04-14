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

    const ncr = await db.nonConformanceReport.findUnique({
      where: { id },
      include: {
        raisedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!ncr) {
      return NextResponse.json(
        { success: false, error: 'NCR not found' },
        { status: 404 }
      );
    }

    // Note: NonConformanceReport model has no plantId field — plant-scope IDOR check not applicable

    return NextResponse.json({ success: true, data: ncr });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load NCR';
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
    if (!hasPermission(session, 'quality.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.nonConformanceReport.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'NCR not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'description', 'severity', 'type', 'status',
      'rootCause', 'correctiveAction', 'dueDate', 'completedDate',
      'notes', 'assetId', 'itemId', 'departmentId',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'dueDate' || field === 'completedDate') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Auto-set completedDate when status changes to closed
    if (body.status === 'closed' && !body.completedDate) {
      updateData.completedDate = new Date();
    }

    const updated = await db.nonConformanceReport.update({
      where: { id },
      data: updateData,
      include: {
        raisedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'non_conformance_report',
        entityId: id,
        oldValues: JSON.stringify({ ncrNumber: existing.ncrNumber, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update NCR';
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
    if (!hasPermission(session, 'quality.delete') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.nonConformanceReport.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'NCR not found' },
        { status: 404 }
      );
    }

    await db.nonConformanceReport.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'non_conformance_report',
        entityId: id,
        oldValues: JSON.stringify({ ncrNumber: existing.ncrNumber }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, message: 'NCR deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete NCR';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
