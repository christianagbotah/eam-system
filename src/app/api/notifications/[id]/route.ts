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

    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Only allow user to view their own notifications
    if (notification.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch related entity data if possible
    let relatedEntity: Record<string, unknown> | null = null;
    if (notification.entityType && notification.entityId) {
      if (notification.entityType === 'work_order') {
        const wo = await db.workOrder.findUnique({
          where: { id: notification.entityId },
          select: { id: true, woNumber: true, title: true, status: true },
        });
        if (wo) relatedEntity = { ...wo, type: 'work_order' };
      } else if (notification.entityType === 'maintenance_request') {
        const mr = await db.maintenanceRequest.findUnique({
          where: { id: notification.entityId },
          select: { id: true, requestNumber: true, title: true, status: true },
        });
        if (mr) relatedEntity = { ...mr, type: 'maintenance_request' };
      } else if (notification.entityType === 'asset') {
        const asset = await db.asset.findUnique({
          where: { id: notification.entityId },
          select: { id: true, name: true, assetTag: true, status: true },
        });
        if (asset) relatedEntity = { ...asset, type: 'asset' };
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...notification, relatedEntity },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notification';
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

    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Only allow user to update their own notifications
    if (notification.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    let read = true;
    try {
      const body = await request.json();
      if (body && typeof body.read === 'boolean') {
        read = body.read;
      }
    } catch {
      // No body sent — default to marking as read
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: read },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update notification';
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

    const { id } = await params;

    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Only allow user to delete their own notifications
    if (notification.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    await db.notification.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete notification';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
