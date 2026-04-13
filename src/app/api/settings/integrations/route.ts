import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getSession } from '@/lib/auth';

const DATA_FILE = join(process.cwd(), 'data', 'integrations.json');

async function readData(): Promise<Record<string, any>> {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeData(data: Record<string, any>): Promise<void> {
  try {
    await mkdir(join(process.cwd(), 'data'), { recursive: true });
  } catch {
    // directory already exists
  }
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/settings/integrations
export async function GET(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await readData();
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
    const body = await req.json();
    const { integrationId, config } = body;

    if (!integrationId || !config) {
      return NextResponse.json({ error: 'Missing integrationId or config' }, { status: 400 });
    }

    const data = await readData();
    data[integrationId] = { ...config, updatedAt: new Date().toISOString() };
    await writeData(data);

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save integration config' }, { status: 500 });
  }
}
