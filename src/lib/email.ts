import nodemailer from 'nodemailer';

// Create transporter (reads from env vars, with sensible defaults for dev)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
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

// Send notification email to a user (looks up email from DB)
export async function sendNotificationEmail(userId: string, subject: string, message: string, actionUrl?: string): Promise<boolean> {
  const { db } = await import('@/lib/db');
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true } });
  if (!user?.email) return false;

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
        <h2 style="margin-top:0;color:#111827;">${subject}</h2>
        <p style="color:#374151;line-height:1.6;">Hello ${user.fullName},</p>
        <p style="color:#374151;line-height:1.6;">${message}</p>
        ${actionLink}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#6b7280;font-size:12px;">This is an automated notification from ${appName}. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  return sendEmail({ to: user.email, subject: `[${appName}] ${subject}`, html });
}

// Test SMTP connection
export async function testSmtpConnection(): Promise<boolean> {
  try {
    const t = getTransporter();
    await t.verify();
    return true;
  } catch {
    return false;
  }
}
