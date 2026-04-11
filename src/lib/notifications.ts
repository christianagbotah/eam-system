import { db } from '@/lib/db';

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}) {
  try {
    await db.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        actionUrl: params.actionUrl || null,
      },
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string,
  actionUrl?: string,
) {
  return createNotification({ userId, type, title, message, entityType, entityId, actionUrl });
}
