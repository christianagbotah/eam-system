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

    const capa = await db.correctiveAction.findUnique({
      where: { id },
    });

    if (!capa) {
      return NextResponse.json(
        { success: false, error: 'CAPA not found' },
        { status: 404 }
      );
    }

    // Note: CorrectiveAction model has no plantId field — plant-scope IDOR check not applicable

    return NextResponse.json({ success: true, data: capa });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load CAPA';
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

    const existing = await db.correctiveAction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'CAPA not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'description', 'type', 'source', 'sourceId',
      'severity', 'status', 'rootCause', 'correctiveAction',
      'preventiveAction', 'responsibleId', 'dueDate',
      'verifiedById', 'verifiedAt', 'effectiveness', 'notes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'dueDate' || field === 'verifiedAt') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else if (field === 'correctiveAction' || field === 'preventiveAction') {
          updateData[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Auto-set verifiedAt when status changes to verified
    if (body.status === 'verified' && !body.verifiedAt) {
      updateData.verifiedAt = new Date();
      updateData.verifiedById = session.userId;
    }

    const updated = await db.correctiveAction.update({
      where: { id },
      data: updateData,
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'corrective_action',
        entityId: id,
        oldValues: JSON.stringify({ capaNumber: existing.capaNumber, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update CAPA';
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

    const existing = await db.correctiveAction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'CAPA not found' },
        { status: 404 }
      );
    }

    await db.correctiveAction.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'corrective_action',
        entityId: id,
        oldValues: JSON.stringify({ capaNumber: existing.capaNumber }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, message: 'CAPA deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete CAPA';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
