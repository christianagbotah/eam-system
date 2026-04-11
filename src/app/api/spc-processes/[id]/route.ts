import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const process = await db.spcProcess.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!process) {
      return NextResponse.json(
        { success: false, error: 'SPC process not found' },
        { status: 404 }
      );
    }

    // Parse samples and compute metrics
    let samples: number[] = [];
    try {
      samples = JSON.parse(process.samples);
    } catch {
      samples = [];
    }

    const mean = samples.length > 0
      ? samples.reduce((a, b) => a + b, 0) / samples.length
      : 0;
    const stdDev = samples.length > 1
      ? Math.sqrt(samples.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (samples.length - 1))
      : 0;

    const range = (process.specMax ?? 0) - (process.specMin ?? 0);
    const cp = range > 0 && stdDev > 0 ? range / (6 * stdDev) : 0;

    const cpu = process.specMax != null && stdDev > 0 ? (process.specMax - mean) / (3 * stdDev) : 0;
    const cpl = process.specMin != null && stdDev > 0 ? (mean - process.specMin) / (3 * stdDev) : 0;
    const cpk = Math.min(cpu, cpl);

    let controlStatus = 'in_control';
    if (cpk < 0.67 || (process.specMin != null && mean < process.specMin) || (process.specMax != null && mean > process.specMax)) {
      controlStatus = 'out_of_control';
    } else if (cpk < 1.0) {
      controlStatus = 'warning';
    }

    return NextResponse.json({
      success: true,
      data: {
        ...process,
        mean: Math.round(mean * 100) / 100,
        cp: Math.round(cp * 100) / 100,
        cpk: Math.round(cpk * 100) / 100,
        controlStatus,
        samples,
        ucl: Math.round((mean + 3 * stdDev) * 100) / 100,
        lcl: Math.round((mean - 3 * stdDev) * 100) / 100,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load SPC process';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.spcProcess.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'SPC process not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'processName', 'parameter', 'unit', 'specMin', 'specMax',
      'target', 'status', 'samples',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'samples') {
          updateData[field] = typeof body[field] === 'string'
            ? body[field]
            : JSON.stringify(body[field]);
        } else if (field === 'specMin' || field === 'specMax' || field === 'target') {
          updateData[field] = body[field] != null ? Number(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.spcProcess.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'spc_process',
        entityId: id,
        oldValues: JSON.stringify({ processName: existing.processName, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update SPC process';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.spcProcess.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'SPC process not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await db.spcProcess.update({
      where: { id },
      data: { status: 'inactive' },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'spc_process',
        entityId: id,
        oldValues: JSON.stringify({ processName: existing.processName, status: existing.status }),
        newValues: JSON.stringify({ deleted: true, status: 'inactive' }),
      },
    });

    return NextResponse.json({ success: true, message: 'SPC process deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete SPC process';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
