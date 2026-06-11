import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const record = await db.failureRecord.findUnique({
      where: { id },
      include: {
        component: {
          select: { id: true, componentCode: true, name: true, componentType: true, criticality: true },
        },
        asset: { select: { id: true, name: true, assetTag: true, status: true } },
        workOrder: {
          select: { id: true, woNumber: true, title: true, status: true, type: true, priority: true },
        },
        reportedBy: { select: { id: true, fullName: true, username: true, department: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ success: false, error: 'Failure record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load failure record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.manage') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.failureRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Failure record not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'failureCode', 'failureCause', 'failureSeverity', 'symptoms',
      'resolvedAt', 'downtimeMinutes', 'repairCost',
      'rootCause', 'correctiveAction', 'preventiveAction',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'resolvedAt' && body[field] !== null) {
          updateData[field] = new Date(body[field]);
        } else if (['downtimeMinutes'].includes(field)) {
          updateData[field] = parseInt(String(body[field]), 10);
        } else if (['repairCost'].includes(field)) {
          updateData[field] = body[field] !== null ? parseFloat(String(body[field])) : null;
        } else if (['symptoms'].includes(field)) {
          updateData[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.failureRecord.update({
      where: { id },
      data: updateData,
      include: {
        component: { select: { id: true, componentCode: true, name: true } },
        asset: { select: { id: true, name: true, assetTag: true } },
        workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
        reportedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await createAuditLog(
      session.userId,
      'failure_record',
      'update',
      id,
      {
        oldValues: { failureMode: existing.failureMode, failureSeverity: existing.failureSeverity },
        newValues: updateData,
      },
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update failure record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.manage') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.failureRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Failure record not found' }, { status: 404 });
    }

    await db.failureRecord.delete({ where: { id } });

    await createAuditLog(
      session.userId,
      'failure_record',
      'delete',
      id,
      { oldValues: { failureMode: existing.failureMode, componentId: existing.componentId } },
    );

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete failure record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
