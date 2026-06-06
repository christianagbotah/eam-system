import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { testSmtpConnection } from '@/lib/email';

// GET /api/settings/smtp-status
export async function GET(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session) && !hasPermission(session, 'system_settings.view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const connected = await testSmtpConnection();

    return NextResponse.json({
      success: true,
      data: {
        connected,
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        configured: !!(process.env.SMTP_HOST),
        from: process.env.SMTP_FROM || null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to check SMTP status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
