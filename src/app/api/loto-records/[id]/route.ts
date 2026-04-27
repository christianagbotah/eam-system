import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Fetch record without Prisma relations (model has no @relation decorators)
    const record = await db.lotoRecord.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ success: false, error: 'LOTO record not found' }, { status: 404 });

    // Resolve related entities manually
    const [requestedBy, supervisor, safetyOfficer, asset, department, workOrder] = await Promise.all([
      record.requestedById
        ? db.user.findUnique({ where: { id: record.requestedById }, select: { id: true, fullName: true } })
        : Promise.resolve(null),
      record.supervisorId
        ? db.user.findUnique({ where: { id: record.supervisorId }, select: { id: true, fullName: true } })
        : Promise.resolve(null),
      record.safetyOfficerId
        ? db.user.findUnique({ where: { id: record.safetyOfficerId }, select: { id: true, fullName: true } })
        : Promise.resolve(null),
      record.assetId
        ? db.asset.findUnique({ where: { id: record.assetId }, select: { id: true, name: true, assetTag: true } })
        : Promise.resolve(null),
      record.departmentId
        ? db.department.findUnique({ where: { id: record.departmentId }, select: { id: true, name: true } })
        : Promise.resolve(null),
      record.workOrderId
        ? db.workOrder.findUnique({ where: { id: record.workOrderId }, select: { id: true, woNumber: true, title: true } })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      success: true,
      data: { ...record, requestedBy, supervisor, safetyOfficer, asset, department, workOrder },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch LOTO record';
    console.error('LOTO GET [id] error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(session, 'safety.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.lotoRecord.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'LOTO record not found' }, { status: 404 });

    // Workflow actions
    const { action, rejectionReason, supervisorId, safetyOfficerId, notes, ...updateData } = body;

    if (action === 'approve') {
      if (!isAdmin(session)) {
        return NextResponse.json({ success: false, error: 'Only supervisors can approve' }, { status: 403 });
      }
      updateData.supervisorId = session.userId;
      updateData.supervisorApprovedAt = new Date();
      if (existing.status === 'pending') updateData.status = 'approved';
    } else if (action === 'safety_approve') {
      if (!isAdmin(session) && !session.roles.includes('safety_officer')) {
        return NextResponse.json({ success: false, error: 'Only safety officers can approve' }, { status: 403 });
      }
      updateData.safetyOfficerId = session.userId;
      updateData.safetyOfficerApprovedAt = new Date();
      if (existing.status === 'approved') updateData.status = 'in_progress';
    } else if (action === 'start') {
      updateData.startedAt = new Date();
      updateData.status = 'in_progress';
    } else if (action === 'complete') {
      updateData.completedAt = new Date();
      updateData.status = 'completed';
    } else if (action === 'cancel') {
      updateData.cancelledAt = new Date();
      updateData.cancelledReason = rejectionReason || 'Cancelled';
      updateData.status = 'cancelled';
    }

    const record = await db.lotoRecord.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update LOTO record';
    console.error('LOTO PUT error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Only admins can delete LOTO records' }, { status: 403 });
    }

    const { id } = await params;
    await db.lotoRecord.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'LOTO record deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete LOTO record';
    console.error('LOTO DELETE error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
