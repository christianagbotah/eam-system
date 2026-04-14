import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// Notification type categories
const TYPE_CATEGORIES: Record<string, string[]> = {
  work_orders: ['wo_assigned', 'wo_started', 'wo_completed', 'wo_closed', 'wo_on_hold', 'wo_cancelled', 'wo_approved'],
  maintenance: ['mr_assigned', 'mr_approved', 'mr_rejected', 'mr_cancelled'],
  safety: ['safety_incident', 'safety_alert'],
  quality: ['quality_ncr', 'quality_inspection', 'quality_audit'],
  system: ['system', 'info'],
};

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // specific type like 'wo_assigned'
    const category = searchParams.get('category'); // category like 'work_orders', 'maintenance', 'safety', 'quality', 'system'
    const readStatus = searchParams.get('read'); // 'read', 'unread', or null for all
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = { userId: session.userId };

    // Filter by specific type
    if (type) {
      where.type = type;
    }

    // Filter by category
    if (category && TYPE_CATEGORIES[category]) {
      where.type = { in: TYPE_CATEGORIES[category] };
    }

    // Filter by read status
    if (readStatus === 'read') {
      where.isRead = true;
    } else if (readStatus === 'unread') {
      where.isRead = false;
    }

    // Filter by date range
    if (startDate || endDate) {
      const createdAt: Record<string, unknown> = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) {
        // Include the entire end date
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }

    const skip = (Math.max(1, page) - 1) * Math.min(Math.max(1, limit), 100);

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        skip,
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: { userId: session.userId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        unreadCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load notifications';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, type, title, message, entityType, entityId, actionUrl } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'userId, type, title, and message are required' },
        { status: 400 }
      );
    }

    // Verify recipient user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Recipient user not found' },
        { status: 400 }
      );
    }

    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        entityType: entityType || null,
        entityId: entityId || null,
        actionUrl: actionUrl || null,
      },
    });

    return NextResponse.json({ success: true, data: notification }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create notification';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    // Batch update: mark specific notifications
    if (body.ids && Array.isArray(body.ids)) {
      const { ids, read } = body;
      if (typeof read !== 'boolean') {
        return NextResponse.json({ success: false, error: 'read boolean is required' }, { status: 400 });
      }

      const result = await db.notification.updateMany({
        where: {
          id: { in: ids },
          userId: session.userId,
        },
        data: { isRead: read },
      });

      return NextResponse.json({ success: true, data: { updatedCount: result.count } });
    }

    // Mark all as read/unread
    if (body.all) {
      const { read = true } = body;
      const result = await db.notification.updateMany({
        where: {
          userId: session.userId,
          isRead: !read, // only update the ones that don't match desired state
        },
        data: { isRead: read },
      });

      return NextResponse.json({ success: true, data: { updatedCount: result.count } });
    }

    // Delete all read
    if (body.deleteRead) {
      const result = await db.notification.deleteMany({
        where: {
          userId: session.userId,
          isRead: true,
        },
      });

      return NextResponse.json({ success: true, data: { deletedCount: result.count } });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request. Provide ids+read, all+read, or deleteRead' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update notifications';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (idsParam) {
      // Delete specific notifications by IDs
      const ids = idsParam.split(',').filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ success: false, error: 'No IDs provided' }, { status: 400 });
      }

      const result = await db.notification.deleteMany({
        where: {
          id: { in: ids },
          userId: session.userId,
        },
      });

      return NextResponse.json({ success: true, data: { deletedCount: result.count } });
    }

    // Delete all notifications for user
    const result = await db.notification.deleteMany({
      where: { userId: session.userId },
    });

    return NextResponse.json({ success: true, data: { deletedCount: result.count } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete notifications';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
