import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/settings/integrations
export async function GET(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Admin-only: sensitive integration credentials (SMS, SMTP, etc.)
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Read all system configs and return as a flat key → parsed JSON object
    const rows = await db.systemConfig.findMany();
    const data: Record<string, any> = {};
    for (const row of rows) {
      try {
        data[row.key] = JSON.parse(row.config);
      } catch {
        data[row.key] = row.config;
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read integrations' }, { status: 500 });
  }
}

// PUT /api/settings/integrations
export async function PUT(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const body = await req.json();
    const { integrationId, config } = body;

    if (!integrationId || !config) {
      return NextResponse.json({ error: 'Missing integrationId or config' }, { status: 400 });
    }

    const configJson = JSON.stringify(config);

    // Upsert into system_configs table
    await db.systemConfig.upsert({
      where: { key: integrationId },
      update: { config: configJson },
      create: { key: integrationId, config: configJson },
    });

    return NextResponse.json({ success: true, data: config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save integration config' }, { status: 500 });
  }
}
