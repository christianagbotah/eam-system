import { db } from '@/lib/db';
import { wsNotify } from '@/lib/ws-notify';

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
  const notification = await createNotification({ userId, type, title, message, entityType, entityId, actionUrl });

  // Fire-and-forget: push real-time notification via WebSocket
  wsNotify(userId, 'notification', {
    type,
    title,
    message,
    entityType,
    entityId,
    actionUrl,
  }).catch(() => {
    // Silently ignore WS failures
  });

  // Fire-and-forget: also send email notification
  import('@/lib/email').then(({ sendNotificationEmail }) => {
    sendNotificationEmail(userId, title, message, actionUrl).catch(() => {
      // Silently ignore email failures
    });
  });

  return notification;
}
