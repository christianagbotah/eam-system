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

    const incident = await db.safetyIncident.findUnique({
      where: { id },
      include: {
        reportedBy: { select: { id: true, fullName: true, username: true } },
        investigatedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { success: false, error: 'Safety incident not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: incident });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load safety incident';
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

    const existing = await db.safetyIncident.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Safety incident not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'description', 'type', 'severity', 'status', 'incidentDate',
      'location', 'rootCause', 'correctiveAction', 'daysLost', 'cost', 'notes',
      'investigatedById',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'incidentDate') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.safetyIncident.update({
      where: { id },
      data: updateData,
      include: {
        reportedBy: { select: { id: true, fullName: true, username: true } },
        investigatedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'safety_incident',
        entityId: id,
        oldValues: JSON.stringify({ incidentNumber: existing.incidentNumber, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update safety incident';
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

    const existing = await db.safetyIncident.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Safety incident not found' },
        { status: 404 }
      );
    }

    await db.safetyIncident.delete({ where: { id } });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'safety_incident',
        entityId: id,
        oldValues: JSON.stringify({ incidentNumber: existing.incidentNumber }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete safety incident';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
