import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper: generate SPC process code SPC-NNNN
async function generateSpcCode(): Promise<string> {
  const prefix = 'SPC';

  const latest = await db.spcProcess.findFirst({
    where: { id: { not: undefined } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  const total = await db.spcProcess.count();
  const nextNum = total + 1;

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { processName: { contains: search } },
        { parameter: { contains: search } },
      ];
    }

    const [processes, total] = await Promise.all([
      db.spcProcess.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          createdBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.spcProcess.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // Compute SPC metrics for each process
    const enriched = processes.map((p) => {
      let samples: number[] = [];
      try {
        samples = JSON.parse(p.samples);
      } catch {
        samples = [];
      }

      const mean = samples.length > 0
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : 0;
      const stdDev = samples.length > 1
        ? Math.sqrt(samples.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (samples.length - 1))
        : 0;

      // Cp calculation
      const range = (p.specMax ?? 0) - (p.specMin ?? 0);
      const cp = range > 0 && stdDev > 0 ? range / (6 * stdDev) : 0;

      // Cpk calculation
      const cpu = p.specMax != null && stdDev > 0 ? (p.specMax - mean) / (3 * stdDev) : 0;
      const cpl = p.specMin != null && stdDev > 0 ? (mean - p.specMin) / (3 * stdDev) : 0;
      const cpk = Math.min(cpu, cpl);

      // Determine control status
      let controlStatus = 'in_control';
      if (cpk < 0.67 || (p.specMin != null && mean < p.specMin) || (p.specMax != null && mean > p.specMax)) {
        controlStatus = 'out_of_control';
      } else if (cpk < 1.0) {
        controlStatus = 'warning';
      }

      return {
        ...p,
        mean: Math.round(mean * 100) / 100,
        cp: Math.round(cp * 100) / 100,
        cpk: Math.round(cpk * 100) / 100,
        controlStatus,
        samples,
      };
    });

    // KPI counts
    const [totalCount, activeCount, outOfControlCount] = await Promise.all([
      db.spcProcess.count(),
      db.spcProcess.count({ where: { status: 'active' } }),
    ]);

    // Count out-of-control from enriched data
    const outOfControl = enriched.filter((p) => p.controlStatus === 'out_of_control').length;
    const inControl = enriched.filter((p) => p.controlStatus === 'in_control').length;
    const cpkGood = enriched.filter((p) => p.cpk >= 1.33).length;

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      kpis: {
        total: totalCount,
        active: activeCount,
        outOfControl,
        inControl,
        cpkGood,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load SPC processes';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      processName,
      parameter,
      unit,
      specMin,
      specMax,
      target,
      samples,
    } = body;

    if (!processName) {
      return NextResponse.json({ success: false, error: 'Process name is required' }, { status: 400 });
    }
    if (!parameter) {
      return NextResponse.json({ success: false, error: 'Parameter is required' }, { status: 400 });
    }

    const spcCode = await generateSpcCode();

    // Parse and validate samples
    let samplesStr = '[]';
    if (samples && Array.isArray(samples)) {
      samplesStr = JSON.stringify(samples.map(Number).filter((v: number) => !isNaN(v)));
    } else if (typeof samples === 'string') {
      try {
        const parsed = JSON.parse(samples);
        samplesStr = JSON.stringify(parsed.map(Number).filter((v: number) => !isNaN(v)));
      } catch {
        samplesStr = '[]';
      }
    }

    const process = await db.spcProcess.create({
      data: {
        processName,
        parameter,
        unit: unit || '',
        specMin: specMin != null ? Number(specMin) : null,
        specMax: specMax != null ? Number(specMax) : null,
        target: target != null ? Number(target) : null,
        status: 'active',
        samples: samplesStr,
        createdById: session.userId,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'spc_process',
        entityId: process.id,
        newValues: JSON.stringify({ spcCode, processName, parameter }),
      },
    });

    return NextResponse.json({ success: true, data: process }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create SPC process';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
