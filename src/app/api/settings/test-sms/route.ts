import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { sendSms, getSmsConfig } from '@/lib/sms';

// POST /api/settings/test-sms
// Sends a test SMS to verify Hubtel integration is working.
export async function POST(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    if (!hasPermission(session, 'settings.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { to } = body;

    if (!to || typeof to !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Recipient phone number is required' },
        { status: 400 },
      );
    }

    // Check SMS is configured
    const smsConfig = await getSmsConfig();
    if (!smsConfig) {
      return NextResponse.json(
        { success: false, error: 'SMS is not configured. Go to Settings → Integrations → SMS Gateway to set up Hubtel credentials.' },
        { status: 400 },
      );
    }

    const result = await sendSms(
      to,
      `Test from iAssetsPro: SMS integration is working! Time: ${new Date().toLocaleString()}`,
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          messageId: result.messageId,
          status: result.status,
          to,
          sentAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send test SMS';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
