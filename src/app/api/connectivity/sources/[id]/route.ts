import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:ConnectivitySourceDetail');

// GET /api/connectivity/sources/[id] — Get source details
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const source = await db.telemetryDataSource.findUnique({ where: { id }, include: { plant: true, gateway: true, createdBy: { select: { id: true, fullName: true } }, mappings: true, sessions: { orderBy: { createdAt: 'desc' }, take: 5 } } });
    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    return NextResponse.json({ data: source });
  } catch (error) {
    log.error('Failed to get source', error as Error);
    return NextResponse.json({ error: 'Failed to get source' }, { status: 500 });
  }
}

// DELETE /api/connectivity/sources/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const source = await db.telemetryDataSource.findUnique({ where: { id } });
    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    await db.telemetryDataSource.update({ where: { id }, data: { isActive: false } });
    log.info(`Deleted connectivity source: ${source.name}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Failed to delete source', error as Error);
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 });
  }
}
