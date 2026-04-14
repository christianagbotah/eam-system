import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';

// POST /api/settings/test-email
export async function POST(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session, 'system_settings.update') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const toEmail = body.email;

    // Look up current user's email if none provided
    let recipientEmail = toEmail;
    if (!recipientEmail) {
      const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { email: true, fullName: true },
      });
      if (!user?.email) {
        return NextResponse.json({ error: 'No email address configured for your account' }, { status: 400 });
      }
      recipientEmail = user.email;
    }

    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'iAssetsPro EAM';
    const timestamp = new Date().toISOString();

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
        <div style="background:#059669;padding:20px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:20px;">${appName}</h1>
        </div>
        <div style="padding:24px;">
          <h2 style="margin-top:0;color:#111827;">Test Email</h2>
          <p style="color:#374151;line-height:1.6;">
            This is a test email from the ${appName} notification system.
            If you received this email, your SMTP configuration is working correctly.
          </p>
          <div style="background:#f3f4f6;border-radius:6px;padding:12px 16px;margin:16px 0;font-size:13px;color:#374151;">
            <strong>Sent at:</strong> ${timestamp}<br>
            <strong>Recipient:</strong> ${recipientEmail}
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="color:#6b7280;font-size:12px;">This is a test notification from ${appName}. Please do not reply to this email.</p>
        </div>
      </div>
    `;

    const success = await sendEmail({
      to: recipientEmail,
      subject: `[${appName}] Test Email — SMTP Configuration Verified`,
      html,
    });

    if (success) {
      return NextResponse.json({ success: true, message: `Test email sent to ${recipientEmail}` });
    } else {
      return NextResponse.json({ error: 'Failed to send test email. Check SMTP configuration.' }, { status: 500 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send test email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
