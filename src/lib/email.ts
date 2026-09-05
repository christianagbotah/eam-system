import nodemailer from 'nodemailer';

// Create transporter lazily. SMTP is an optional delivery channel: it is only
// enabled when SMTP_HOST is explicitly configured. This prevents production,
// CI, and UAT processes from silently attempting localhost:587.
let transporter: nodemailer.Transporter | null = null;

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

function getTransporter(): nodemailer.Transporter {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP_HOST is not configured');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!.trim(),
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
  }
  return transporter;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  if (!isSmtpConfigured()) return false;

  try {
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'iAssetsPro EAM';
    const companyEmail = process.env.SMTP_FROM
      || `${appName} <noreply@localhost>`;

    const t = getTransporter();
    await t.sendMail({
      from: companyEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
    return true;
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return false;
  }
}

// Send notification email to a user. The optional target address lets the
// notification preference layer select an alternate address without sending a
// duplicate copy to the profile email first.
export async function sendNotificationEmail(
  userId: string,
  subject: string,
  message: string,
  actionUrl?: string,
  targetEmail?: string,
): Promise<boolean> {
  const { db } = await import('@/lib/db');
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true },
  });
  const recipient = targetEmail?.trim() || user?.email;
  if (!user || !recipient) return false;

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'iAssetsPro EAM';
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  const actionLink = actionUrl
    ? `\n\n<a href="${appUrl}/#/${actionUrl.replace(/^\//, '')}" style="background:#059669;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">View Details</a>`
    : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="background:#059669;padding:20px;border-radius:8px 8px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">${appName}</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="margin-top:0;color:#111827;">${subject}</h2>
        <p style="color:#374151;line-height:1.6;">Hello ${user.fullName},</p>
        <p style="color:#374151;line-height:1.6;">${message}</p>
        ${actionLink}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#6b7280;font-size:12px;">This is an automated notification from ${appName}. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  return sendEmail({ to: recipient, subject: `[${appName}] ${subject}`, html });
}

// Test SMTP connection
export async function testSmtpConnection(): Promise<boolean> {
  if (!isSmtpConfigured()) return false;

  try {
    const t = getTransporter();
    await t.verify();
    return true;
  } catch {
    return false;
  }
}
