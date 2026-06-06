/**
 * SMS Service — Hubtel Integration
 *
 * Uses the Hubtel Programmable SMS API v1 to send SMS messages.
 * Docs: https://developers.hubtel.com
 *
 * Authentication: HTTP Basic Auth (ClientId:ClientSecret)
 * Endpoint: https://api.hubtel.com/v1/messages/send
 *
 * Configuration is stored in the system_configs DB table under key "sms":
 *   {
 *     "clientId": "your-hubtel-client-id",
 *     "clientSecret": "your-hubtel-client-secret",
 *     "senderName": "iAssetsPro",    // Registered sender name on Hubtel
 *     "connected": true
 *   }
 */

// ============================================================================
// Types
// ============================================================================

export interface SmsConfig {
  /** Hubtel API Client ID */
  clientId: string;
  /** Hubtel API Client Secret */
  clientSecret: string;
  /** Registered sender name (alphanumeric, max 11 chars) */
  senderName: string;
  /** Whether SMS is connected/configured */
  connected: boolean;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
}

// ============================================================================
// Config loader — reads from DB (system_configs table, key="sms")
// ============================================================================

export async function getSmsConfig(): Promise<SmsConfig | null> {
  try {
    const { db } = await import('@/lib/db');
    const row = await db.systemConfig.findUnique({ where: { key: 'sms' } });

    if (!row?.config) return null;

    const parsed = JSON.parse(row.config) as Partial<SmsConfig>;
    if (parsed.connected && parsed.clientId && parsed.clientSecret) {
      return parsed as SmsConfig;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// Send SMS via Hubtel
// ============================================================================

const HUBTEL_SMS_URL = 'https://api.hubtel.com/v1/messages/send';

/**
 * Send an SMS message via the Hubtel API.
 *
 * @param to  Recipient phone number (e.g. "23324XXXXXXX" or "+23324XXXXXXX")
 * @param content  Message text (max 160 chars per SMS segment)
 * @param senderName  Override sender name (falls back to config)
 * @param config  Override SMS config (falls back to system_configs DB)
 */
export async function sendSms(
  to: string,
  content: string,
  senderName?: string,
  config?: SmsConfig,
): Promise<SendSmsResult> {
  const smsConfig = config || await getSmsConfig();

  if (!smsConfig?.clientId || !smsConfig?.clientSecret) {
    return { success: false, error: 'SMS not configured. Add Hubtel credentials in Settings → Integrations → SMS Gateway.' };
  }

  // Normalize phone number: strip leading +, spaces, dashes
  const normalizedTo = to.replace(/[\s\-+]/g, '');

  if (!normalizedTo || normalizedTo.length < 10) {
    return { success: false, error: `Invalid phone number: "${to}"` };
  }

  if (!content || content.trim().length === 0) {
    return { success: false, error: 'Message content is empty' };
  }

  const from = senderName || smsConfig.senderName || 'iAssetsPro';

  try {
    const credentials = Buffer.from(`${smsConfig.clientId}:${smsConfig.clientSecret}`).toString('base64');

    const response = await fetch(HUBTEL_SMS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify({
        From: from,
        To: normalizedTo,
        Content: content.trim(),
      }),
    });

    const data = await response.json();

    if (response.ok && (data.ResponseCode === '0000' || data.Status === 'Success')) {
      return {
        success: true,
        messageId: data.MessageId || data.messageId,
        status: data.Status || data.status,
      };
    }

    // Hubtel error format
    const errMsg =
      data.StatusDescription ||
      data.message ||
      data.error ||
      `Hubtel returned status ${response.status}`;

    return {
      success: false,
      error: errMsg,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send SMS';
    return { success: false, error: message };
  }
}

// ============================================================================
// Convenience: send critical alert SMS
// ============================================================================

export async function sendAlertSms(
  to: string,
  subject: string,
  message: string,
): Promise<SendSmsResult> {
  // Hubtel concatenates multi-part SMS automatically, but keep it concise
  const content = `[${subject}] ${message}`;
  return sendSms(to, content);
}
