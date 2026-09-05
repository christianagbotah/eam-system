import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isSmtpConfigured: vi.fn(),
  sendNotificationEmail: vi.fn(),
  add: vi.fn(),
  process: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  isSmtpConfigured: mocks.isSmtpConfigured,
  sendNotificationEmail: mocks.sendNotificationEmail,
}));

vi.mock('@/lib/queue', () => ({
  jobQueue: {
    add: mocks.add,
    process: mocks.process,
  },
}));

import {
  enqueueNotificationEmail,
  NOTIFICATION_EMAIL_QUEUE,
  processNotificationEmailJob,
} from '@/lib/notification-email-queue';

const JOB = {
  notificationId: 'notification-123',
  userId: 'user-123',
  type: 'repair_wo_started',
  title: 'WO Started',
  message: 'WO-001 has started',
  actionUrl: 'wo-detail?id=wo-1',
  targetEmail: 'technician@example.com',
};

describe('notification email queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.process.mockResolvedValue(undefined);
    mocks.add.mockResolvedValue('notification-email-notification-123');
  });

  it('skips SMTP cleanly when the channel is not configured', async () => {
    mocks.isSmtpConfigured.mockReturnValue(false);

    const result = await processNotificationEmailJob(JOB);

    expect(result).toEqual({
      delivered: false,
      skipped: 'smtp_not_configured',
      userId: 'user-123',
      type: 'repair_wo_started',
    });
    expect(mocks.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('throws on a configured SMTP delivery failure so the queue can retry', async () => {
    mocks.isSmtpConfigured.mockReturnValue(true);
    mocks.sendNotificationEmail.mockResolvedValue(false);

    await expect(processNotificationEmailJob(JOB)).rejects.toThrow(
      'Notification email delivery failed for user user-123',
    );
  });

  it('delivers to the preference-selected target address', async () => {
    mocks.isSmtpConfigured.mockReturnValue(true);
    mocks.sendNotificationEmail.mockResolvedValue(true);

    await expect(processNotificationEmailJob(JOB)).resolves.toEqual({
      delivered: true,
      userId: 'user-123',
      type: 'repair_wo_started',
    });
    expect(mocks.sendNotificationEmail).toHaveBeenCalledWith(
      'user-123',
      'WO Started',
      'WO-001 has started',
      'wo-detail?id=wo-1',
      'technician@example.com',
    );
  });

  it('queues with a stable id, retries, and exponential backoff', async () => {
    await enqueueNotificationEmail(JOB);

    expect(mocks.process).toHaveBeenCalledWith(
      NOTIFICATION_EMAIL_QUEUE,
      expect.any(Function),
    );
    expect(mocks.add).toHaveBeenCalledWith(NOTIFICATION_EMAIL_QUEUE, {
      id: 'notification-email-notification-123',
      name: 'deliver-notification-email',
      data: JOB,
      attempts: 5,
      backoff: 5_000,
    });
  });
});
