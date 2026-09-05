import { isSmtpConfigured, sendNotificationEmail } from '@/lib/email';
import { jobQueue, type JobRecord } from '@/lib/queue';

/**
 * Dedicated queue name rather than the legacy QUEUES.EMAIL placeholder. The
 * existing queue remains available for older generic email jobs while Repairs
 * notifications get a real delivery processor with retry semantics.
 */
export const NOTIFICATION_EMAIL_QUEUE = 'notification-email-delivery';

export interface NotificationEmailJobData {
  notificationId?: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  targetEmail?: string;
}

let processorRegistration: Promise<void> | null = null;

/**
 * Execute one durable email-delivery job.
 *
 * SMTP is optional. When SMTP_HOST is absent the channel is intentionally
 * disabled and the job completes as skipped without making a network call.
 * When SMTP is configured but delivery fails, throw so BullMQ applies the job
 * attempts/backoff policy instead of silently losing the notification.
 */
export async function processNotificationEmailJob(
  data: NotificationEmailJobData,
): Promise<{ delivered: boolean; skipped?: 'smtp_not_configured'; userId: string; type: string }> {
  if (!isSmtpConfigured()) {
    return {
      delivered: false,
      skipped: 'smtp_not_configured',
      userId: data.userId,
      type: data.type,
    };
  }

  const delivered = await sendNotificationEmail(
    data.userId,
    data.title,
    data.message,
    data.actionUrl,
    data.targetEmail,
  );

  if (!delivered) {
    throw new Error(`Notification email delivery failed for user ${data.userId}`);
  }

  return { delivered: true, userId: data.userId, type: data.type };
}

export function registerNotificationEmailProcessor(): Promise<void> {
  if (!processorRegistration) {
    processorRegistration = jobQueue.process(
      NOTIFICATION_EMAIL_QUEUE,
      async (job: JobRecord) =>
        processNotificationEmailJob(job.data as NotificationEmailJobData),
    ).catch((error) => {
      // A transient Redis/BullMQ startup failure must not poison this process
      // forever. Clear the cached rejected registration so the next enqueue can
      // attempt worker registration again.
      processorRegistration = null;
      throw error;
    });
  }
  return processorRegistration;
}

/**
 * Queue an email after the in-app notification has been persisted. A stable
 * notification id becomes the BullMQ job id, preventing duplicate email work
 * when the same persisted notification is dispatched more than once.
 */
export async function enqueueNotificationEmail(
  data: NotificationEmailJobData,
): Promise<string> {
  await registerNotificationEmailProcessor();

  return jobQueue.add(NOTIFICATION_EMAIL_QUEUE, {
    ...(data.notificationId ? { id: `notification-email-${data.notificationId}` } : {}),
    name: 'deliver-notification-email',
    data,
    attempts: 5,
    backoff: 5_000,
  });
}
