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

    const survey = await db.survey.findUnique({
      where: { id },
    });

    if (!survey) {
      return NextResponse.json({ success: false, error: 'Survey not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: survey });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load survey';
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

    const existing = await db.survey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Survey not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = ['title', 'description', 'type', 'status', 'targetGroup', 'questions', 'totalResponses', 'responses'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'questions' || field === 'responses') {
          updateData[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.survey.update({
      where: { id },
      data: updateData,
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'survey',
        entityId: id,
        oldValues: JSON.stringify({ title: existing.title, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update survey';
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

    const existing = await db.survey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Survey not found' }, { status: 404 });
    }

    await db.survey.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'survey',
        entityId: id,
        oldValues: JSON.stringify({ title: existing.title }),
      },
    });

    return NextResponse.json({ success: true, message: 'Survey deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete survey';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
