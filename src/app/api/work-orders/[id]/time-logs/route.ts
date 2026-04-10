import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

const VALID_ACTIONS = ['start', 'pause', 'resume', 'complete'];

export async function POST(
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
    const { action, notes } = body;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked && !session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Work order is locked' }, { status: 400 });
    }

    const now = new Date();

    // Build WO update data based on action
    const woUpdateData: Record<string, unknown> = {};

    if (action === 'start') {
      if (!wo.actualStart) {
        woUpdateData.actualStart = now;
      }
    }

    if (action === 'complete') {
      if (!wo.actualEnd) {
        woUpdateData.actualEnd = now;
      }

      // Recalculate actualHours: difference between actualStart (or now) and actualEnd (or now)
      const startTime = wo.actualStart ? new Date(wo.actualStart).getTime() : now.getTime();
      const endTime = now.getTime();
      const hours = Math.round(((endTime - startTime) / (1000 * 60 * 60)) * 100) / 100;

      // Add to existing actualHours if any
      const existingHours = wo.actualHours || 0;
      woUpdateData.actualHours = existingHours + hours;
    }

    // Update work order if there are changes
    if (Object.keys(woUpdateData).length > 0) {
      await db.workOrder.update({
        where: { id },
        data: woUpdateData,
      });
    }

    // Create time log entry
    const timeLog = await db.workOrderTimeLog.create({
      data: {
        workOrderId: id,
        userId: session.userId,
        action,
        notes: notes || null,
        timestamp: now,
      },
      include: {
        user: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'wo_time_log',
        entityId: timeLog.id,
        newValues: JSON.stringify({
          workOrderId: id,
          action,
          notes: notes || undefined,
          woUpdates: woUpdateData,
        }),
      },
    });

    return NextResponse.json({ success: true, data: timeLog }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create time log';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
