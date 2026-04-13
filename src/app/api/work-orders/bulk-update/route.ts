import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, isAdmin } from '@/lib/auth';

/**
 * PUT /api/work-orders/bulk-update
 *
 * Bulk updates work orders (status, priority, assignedTo, plannedStart, plannedEnd).
 * Admin/planner only. Max 100 WOs per request.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasAnyPermission(session, ['work_orders.update', 'work_orders.*'])) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for bulk update' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids, updates } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ids must be a non-empty array of work order IDs' },
        { status: 400 }
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 work orders per bulk update' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { success: false, error: 'updates must be an object with fields to update' },
        { status: 400 }
      );
    }

    // Whitelist allowed bulk-update fields
    const allowedFields = ['priority', 'assignedTo', 'plannedStart', 'plannedEnd', 'estimatedHours', 'departmentId'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'plannedStart' || field === 'plannedEnd') {
          updateData[field] = updates[field] ? new Date(updates[field]) : null;
        } else {
          updateData[field] = updates[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Perform bulk update
    const result = await db.workOrder.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    // Audit log (one entry per WO)
    for (const woId of ids) {
      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: 'bulk_update',
          entityType: 'work_order',
          entityId: woId,
          newValues: JSON.stringify({
            ...updateData,
            bulkCount: ids.length,
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: result.count,
        requestedCount: ids.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to bulk update work orders';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
