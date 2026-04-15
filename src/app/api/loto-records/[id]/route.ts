import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission, isAdmin } from '@/lib/permissions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    
    const { id } = await params;
    const record = await db.lotoRecord.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        supervisor: { select: { id: true, fullName: true } },
        safetyOfficer: { select: { id: true, fullName: true } },
        asset: { select: { id: true, name: true, assetTag: true } },
        department: { select: { id: true, name: true } },
        workOrder: { select: { id: true, woNumber: true, title: true } },
      },
    });

    if (!record) return NextResponse.json({ success: false, error: 'LOTO record not found' }, { status: 404 });

    // Plant scope check for non-admin
    if (!isAdmin(session) && session.user.plantId && record.plantId !== session.user.plantId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error('LOTO GET [id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch LOTO record' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
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
      if (!isAdmin(session) {
        return NextResponse.json({ success: false, error: 'Only supervisors can approve' }, { status: 403 });
      }
      updateData.supervisorId = session.user.id;
      updateData.supervisorApprovedAt = new Date();
      if (existing.status === 'pending') updateData.status = 'approved';
    } else if (action === 'safety_approve') {
      if (!isAdmin(session) && session.user.role !== 'safety_officer') {
        return NextResponse.json({ success: false, error: 'Only safety officers can approve' }, { status: 403 });
      }
      updateData.safetyOfficerId = session.user.id;
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
  } catch (error: any) {
    console.error('LOTO PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update LOTO record' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Only admins can delete LOTO records' }, { status: 403 });
    }

    const { id } = await params;
    await db.lotoRecord.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'LOTO record deleted' });
  } catch (error: any) {
    console.error('LOTO DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete LOTO record' }, { status: 500 });
  }
}
