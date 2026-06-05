import { db } from '@/lib/db';
import { wsNotify } from '@/lib/ws-notify';

// ============================================================================
// Types
// ============================================================================

interface NotificationPreferences {
  channels?: {
    inApp?: boolean;
    email?: boolean;
    emailAddr?: string;
    sms?: boolean;
    phone?: string;
  };
  quietHours?: {
    enabled?: boolean;
    start?: string;
    end?: string;
    timezone?: string;
  };
  types?: {
    woAssigned?: boolean;
    woStatusChange?: boolean;
    mrApprovedRejected?: boolean;
    pmDue?: boolean;
    lowStockAlert?: boolean;
    assetConditionAlert?: boolean;
    systemNotifications?: boolean;
    safetyAlerts?: boolean;
    qualityAlerts?: boolean;
  };
}

interface UserNotificationProfile {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  notificationPreferences: NotificationPreferences | null;
}

// Map notification types to preference keys for opt-out control
const TYPE_TO_PREF_KEY: Record<string, keyof NotificationPreferences['types']> = {
  wo_assigned: 'woAssigned',
  wo_started: 'woStatusChange',
  wo_completed: 'woStatusChange',
  wo_closed: 'woStatusChange',
  wo_on_hold: 'woStatusChange',
  wo_cancelled: 'woStatusChange',
  wo_approved: 'woStatusChange',
  wo_rework: 'woStatusChange',
  mr_assigned: 'mrApprovedRejected',
  mr_approved: 'mrApprovedRejected',
  mr_rejected: 'mrApprovedRejected',
  mr_cancelled: 'mrApprovedRejected',
  mr_converted: 'mrApprovedRejected',
  pm_due: 'pmDue',
  low_stock_alert: 'lowStockAlert',
  asset_condition: 'assetConditionAlert',
  safety_incident: 'safetyAlerts',
  safety_alert: 'safetyAlerts',
  quality_ncr: 'qualityAlerts',
  quality_inspection: 'qualityAlerts',
  quality_audit: 'qualityAlerts',
  escalation_l1: 'woStatusChange',
  escalation_l2: 'woStatusChange',
};

// Urgent types that bypass quiet hours
const URGENT_TYPES = new Set([
  'safety_incident',
  'safety_alert',
  'escalation_l2',
]);

// ============================================================================
// Core Functions
// ============================================================================

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
    return await db.notification.create({
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

/**
 * Check if we're inside the user's quiet hours.
 */
function isQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHours?.enabled) return false;

  const now = new Date();
  const startParts = (prefs.quietHours.start || '22:00').split(':');
  const endParts = (prefs.quietHours.end || '07:00').split(':');

  const startHour = parseInt(startParts[0], 10);
  const startMin = parseInt(startParts[1], 10);
  const endHour = parseInt(endParts[0], 10);
  const endMin = parseInt(endParts[1], 10);

  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight quiet hours (e.g. 22:00 → 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  // Same-day quiet hours (e.g. 12:00 → 14:00)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if the notification type is opted-in by the user.
 * If no preferences are set, default to true (all types enabled).
 */
function isTypeEnabled(prefs: NotificationPreferences | null, type: string): boolean {
  if (!prefs?.types) return true; // Default: all types enabled
  const prefKey = TYPE_TO_PREF_KEY[type];
  if (!prefKey) return true; // Unknown types always enabled
  return prefs.types[prefKey] !== false;
}

/**
 * Send an SMS notification to a user.
 * Truncates message to fit within SMS character limits.
 */
async function sendNotificationSms(phone: string, title: string, message: string): Promise<void> {
  try {
    const { sendAlertSms } = await import('@/lib/sms');
    // Truncate message for SMS (keep it concise)
    const smsMessage = `${title}: ${message}`.substring(0, 200);
    await sendAlertSms(phone, 'iAssetsPro', smsMessage);
  } catch (err) {
    // Silently ignore SMS failures — never block the main flow
    console.error('[SMS] Failed to send notification:', err);
  }
}

/**
 * Primary notification dispatch function.
 *
 * Sends notifications via ALL channels (in-app, email, SMS) based on user preferences.
 * - In-app: Always sent (creates DB record + WebSocket push)
 * - Email: Sent unless user explicitly opts out
 * - SMS: Sent if user has opted in AND has a phone number configured
 * - Quiet hours: Non-urgent notifications are suppressed during quiet hours
 *
 * @param userId      - Target user ID
 * @param type        - Notification type (e.g. 'wo_assigned', 'mr_approved')
 * @param title       - Notification title
 * @param message     - Notification body/message
 * @param entityType  - Entity type (e.g. 'work_order', 'maintenance_request')
 * @param entityId    - Entity ID
 * @param actionUrl   - SPA navigation URL
 * @param options     - Override options (force channels, skip preference checks)
 */
export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string,
  actionUrl?: string,
  options?: {
    /** Force SMS even if user preference is off (for critical alerts) */
    forceSms?: boolean;
    /** Force email even if user preference is off */
    forceEmail?: boolean;
    /** Skip quiet hours check */
    skipQuietHours?: boolean;
  },
) {
  // 1. Always create in-app notification (DB + WebSocket push)
  const notification = await createNotification({
    userId,
    type,
    title,
    message,
    entityType,
    entityId,
    actionUrl,
  });

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

  // 2. Fetch user profile for email/SMS dispatch
  //    This is done in a fire-and-forget pattern to avoid blocking the main response
  setImmediate(async () => {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          notificationPreferences: true,
        },
      });

      if (!user) return;

      const prefs = (user.notificationPreferences as NotificationPreferences) || null;

      // Check type opt-out (in-app was already sent, this only affects email/SMS)
      if (!isTypeEnabled(prefs, type)) return;

      // Check quiet hours (skip for urgent types or forced)
      const isUrgent = URGENT_TYPES.has(type);
      if (!options?.skipQuietHours && !isUrgent && isQuietHours(prefs)) {
        return; // Suppress during quiet hours
      }

      // 3. Send Email (default: enabled unless explicitly opted out)
      const emailEnabled = options?.forceEmail || prefs?.channels?.email !== false;
      if (emailEnabled && user.email) {
        try {
          const { sendNotificationEmail } = await import('@/lib/email');
          // Use the user's custom email address if set in preferences, otherwise use their account email
          const emailAddr = prefs?.channels?.emailAddr || user.email;
          await sendNotificationEmail(userId, title, message, actionUrl);
          // If custom email address is different from account email, send to that too
          if (prefs?.channels?.emailAddr && prefs.channels.emailAddr !== user.email) {
            const { sendEmail } = await import('@/lib/email');
            const appName = process.env.NEXT_PUBLIC_APP_NAME || 'iAssetsPro EAM';
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
            const actionLink = actionUrl
              ? `\n\n<a href="${appUrl}${actionUrl}" style="background:#059669;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">View Details</a>`
              : '';
            const html = `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
                <div style="background:#059669;padding:20px;border-radius:8px 8px 0 0;">
                  <h1 style="color:white;margin:0;font-size:20px;">${appName}</h1>
                </div>
                <div style="padding:24px;">
                  <h2 style="margin-top:0;color:#111827;">${title}</h2>
                  <p style="color:#374151;line-height:1.6;">Hello ${user.fullName},</p>
                  <p style="color:#374151;line-height:1.6;">${message}</p>
                  ${actionLink}
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
                  <p style="color:#6b7280;font-size:12px;">This is an automated notification from ${appName}. Please do not reply to this email.</p>
                </div>
              </div>`;
            await sendEmail({ to: emailAddr, subject: `[${appName}] ${title}`, html });
          }
        } catch (err) {
          console.error('[Email] Failed to send notification:', err);
        }
      }

      // 4. Send SMS (default: enabled if user has opted in OR forceSms is set)
      const smsEnabled = options?.forceSms || prefs?.channels?.sms === true;
      const phone = prefs?.channels?.phone || user.phone;
      if (smsEnabled && phone) {
        await sendNotificationSms(phone, title, message);
      }
    } catch (err) {
      console.error('[Notification] Failed to dispatch email/SMS:', err);
    }
  });

  return notification;
}

// ============================================================================
// Convenience Helpers
// ============================================================================

/**
 * Notify multiple users at once. Used for broadcasts like admin alerts.
 */
export async function notifyMultipleUsers(
  userIds: string[],
  type: string,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string,
  actionUrl?: string,
  options?: Parameters<typeof notifyUser>[7],
) {
  // Send in-app notifications in parallel (DB + WS)
  const promises = userIds.map(userId =>
    notifyUser(userId, type, title, message, entityType, entityId, actionUrl, options)
  );
  await Promise.allSettled(promises);
}

/**
 * Find all admin users and notify them. Used for critical alerts.
 */
export async function notifyAdmins(
  type: string,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string,
  actionUrl?: string,
  options?: Parameters<typeof notifyUser>[7],
) {
  try {
    const admins = await db.user.findMany({
      where: {
        status: 'active',
        userRoles: {
          some: {
            role: {
              slug: 'admin',
            },
          },
        },
      },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await notifyMultipleUsers(
      admins.map(a => a.id),
      type,
      title,
      message,
      entityType,
      entityId,
      actionUrl,
      options,
    );
  } catch (err) {
    console.error('[Notification] Failed to notify admins:', err);
  }
}

/**
 * Notify the supervisor of a department.
 */
export async function notifyDepartmentSupervisor(
  departmentId: string,
  type: string,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string,
  actionUrl?: string,
  options?: Parameters<typeof notifyUser>[7],
) {
  try {
    const dept = await db.department.findUnique({
      where: { id: departmentId },
      select: { supervisorId: true },
    });
    if (dept?.supervisorId) {
      await notifyUser(dept.supervisorId, type, title, message, entityType, entityId, actionUrl, options);
    }
  } catch (err) {
    console.error('[Notification] Failed to notify department supervisor:', err);
  }
}
