import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { getPlantScope } from '@/lib/plant-scope';

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

    const inspection = await db.qualityInspection.findUnique({
      where: { id },
      include: {
        inspectedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!inspection) {
      return NextResponse.json(
        { success: false, error: 'Inspection not found' },
        { status: 404 }
      );
    }

    // IDOR protection: ensure user has access to this inspection's plant
    if (inspection.plantId) {
      const plantScope = await getPlantScope(request, session);
      if (plantScope.isScoped && plantScope.plantId && inspection.plantId !== plantScope.plantId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, data: inspection });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load inspection';
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

    const existing = await db.qualityInspection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Inspection not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'description', 'type', 'status', 'result',
      'scheduledDate', 'completedDate', 'defects', 'notes',
      'assetId', 'itemId', 'orderId',
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

    // Auto-set completedDate when result is set
    if (body.result && !body.completedDate) {
      updateData.completedDate = new Date();
      updateData.status = body.result === 'pass' ? 'passed' : body.result === 'fail' ? 'failed' : 'conditional';
    }

    const updated = await db.qualityInspection.update({
      where: { id },
      data: updateData,
      include: {
        inspectedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'quality_inspection',
        entityId: id,
        oldValues: JSON.stringify({ inspectionNumber: existing.inspectionNumber, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update inspection';
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

    const existing = await db.qualityInspection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Inspection not found' },
        { status: 404 }
      );
    }

    await db.qualityInspection.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'quality_inspection',
        entityId: id,
        oldValues: JSON.stringify({ inspectionNumber: existing.inspectionNumber }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, message: 'Inspection deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete inspection';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
