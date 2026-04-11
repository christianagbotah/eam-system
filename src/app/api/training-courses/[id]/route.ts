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

    const course = await db.trainingCourse.findUnique({
      where: { id },
    });

    if (!course) {
      return NextResponse.json({ success: false, error: 'Training course not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: course });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load training course';
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

    const existing = await db.trainingCourse.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Training course not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = ['title', 'description', 'category', 'type', 'durationHours', 'instructor', 'maxParticipants', 'certification', 'validForMonths', 'status', 'notes'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'durationHours' || field === 'maxParticipants' || field === 'validForMonths') {
          updateData[field] = body[field] !== null ? Number(body[field]) : null;
        } else if (field === 'certification') {
          updateData[field] = body[field] === true;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.trainingCourse.update({
      where: { id },
      data: updateData,
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'training_course',
        entityId: id,
        oldValues: JSON.stringify({ title: existing.title, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update training course';
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

    const existing = await db.trainingCourse.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Training course not found' }, { status: 404 });
    }

    await db.trainingCourse.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'training_course',
        entityId: id,
        oldValues: JSON.stringify({ title: existing.title }),
      },
    });

    return NextResponse.json({ success: true, message: 'Training course deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete training course';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
