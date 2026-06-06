import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

// Helper: check admin or system_settings permission
function canViewSettings(session: any): boolean {
  return isAdmin(session) || hasPermission(session, 'system_settings.view');
}

// GET /api/settings/smtp-config
export async function GET(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canViewSettings(session)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const row = await db.systemConfig.findUnique({ where: { key: 'smtp' } });
    if (!row?.config) {
      return NextResponse.json({ success: true, data: {} });
    }
    const data = JSON.parse(row.config);
    // Mask password before sending to client
    if (data.pass) {
      data.pass = '••••••••';
    }
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to read SMTP config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/settings/smtp-config
export async function PUT(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session, 'system_settings.update') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const body = await req.json();

    // Read existing config to preserve password if not provided
    const existingRow = await db.systemConfig.findUnique({ where: { key: 'smtp' } });
    let existing: Record<string, any> = {};
    if (existingRow?.config) {
      try { existing = JSON.parse(existingRow.config); } catch { /* ignore */ }
    }

    // If password is the mask placeholder, keep the existing password
    if (body.pass === '••••••••' || !body.pass) {
      body.pass = existing.pass || '';
    }

    const config = {
      host: body.host || '',
      port: String(body.port || '587'),
      secure: !!body.secure,
      user: body.user || '',
      pass: body.pass,
      from: body.from || '',
      updatedAt: new Date().toISOString(),
      updatedBy: session.userId,
    };

    const configJson = JSON.stringify(config);
    await db.systemConfig.upsert({
      where: { key: 'smtp' },
      update: { config: configJson },
      create: { key: 'smtp', config: configJson },
    });

    // Set environment variables for nodemailer to use
    process.env.SMTP_HOST = config.host;
    process.env.SMTP_PORT = config.port;
    process.env.SMTP_SECURE = String(config.secure);
    process.env.SMTP_USER = config.user;
    process.env.SMTP_PASS = config.pass;
    process.env.SMTP_FROM = config.from;

    return NextResponse.json({ success: true, data: config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save SMTP config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
