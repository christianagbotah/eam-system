import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

const DATA_FILE = join(process.cwd(), 'data', 'smtp-config.json');

async function readData(): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeData(data: Record<string, unknown>): Promise<void> {
  try {
    await mkdir(join(process.cwd(), 'data'), { recursive: true });
  } catch {
    // directory already exists
  }
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/settings/smtp-config
export async function GET(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await readData();
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

    // Read existing data to preserve password if not provided
    const existing = await readData();

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

    await writeData(config);

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
