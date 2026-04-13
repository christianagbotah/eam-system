import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getSession } from '@/lib/auth';

const DATA_FILE = join(process.cwd(), 'data', 'backups.json');

interface BackupEntry {
  id: string;
  date: string;
  type: 'Automatic' | 'Manual';
  size: string;
  status: 'completed' | 'failed';
  createdBy?: string;
}

async function readBackups(): Promise<BackupEntry[]> {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeBackups(backups: BackupEntry[]): Promise<void> {
  try {
    await mkdir(join(process.cwd(), 'data'), { recursive: true });
  } catch {
    // directory already exists
  }
  await writeFile(DATA_FILE, JSON.stringify(backups, null, 2), 'utf-8');
}

// GET /api/backups
export async function GET(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const backups = await readBackups();
    return NextResponse.json({ success: true, data: backups });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read backups' }, { status: 500 });
  }
}

// POST /api/backups
export async function POST(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const { type, size, status } = body as { type?: string; size?: string; status?: string };

    const backups = await readBackups();
    const entry: BackupEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date: new Date().toISOString(),
      type: type === 'Automatic' ? 'Automatic' : 'Manual',
      size: size || '0 KB',
      status: status === 'failed' ? 'failed' : 'completed',
      createdBy: session.userId || undefined,
    };
    backups.unshift(entry);

    // Keep only last 50 backups
    if (backups.length > 50) backups.length = 50;

    await writeBackups(backups);
    return NextResponse.json({ success: true, data: entry });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to record backup' }, { status: 500 });
  }
}
