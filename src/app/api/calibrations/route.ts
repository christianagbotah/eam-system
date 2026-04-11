import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper: generate calibration number CAL-YYYYMM-NNNN
async function generateCalNumber(): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `CAL-${ym}-`;

  const latest = await db.calibrationRecord.findFirst({
    where: { calibrationNumber: { startsWith: prefix } },
    orderBy: { calibrationNumber: 'desc' },
    select: { calibrationNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.calibrationNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
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
        { calibrationNumber: { contains: search } },
        { title: { contains: search } },
        { instrumentName: { contains: search } },
        { serialNumber: { contains: search } },
      ];
    }

    const [records, total] = await Promise.all([
      db.calibrationRecord.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.calibrationRecord.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    const now = new Date();
    const [totalKpi, calibratedCount, dueSoonCount, overdueCount] = await Promise.all([
      db.calibrationRecord.count(),
      db.calibrationRecord.count({ where: { status: 'calibrated' } }),
      db.calibrationRecord.count({
        where: {
          status: { in: ['calibrated'] },
          nextDueDate: { gt: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      db.calibrationRecord.count({
        where: {
          OR: [
            { status: 'out_of_calibration' },
            { nextDueDate: { lt: now } },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      kpis: {
        total: totalKpi,
        calibrated: calibratedCount,
        dueSoon: dueSoonCount,
        overdue: overdueCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load calibrations';
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
      instrumentName,
      serialNumber,
      title,
      description,
      calibrationDate,
      nextDueDate,
      status,
      standardUsed,
      result,
      asFound,
      asLeft,
      uncertainty,
      notes,
    } = body;

    if (!instrumentName && !title) {
      return NextResponse.json({ success: false, error: 'Instrument name or title is required' }, { status: 400 });
    }

    const calibrationNumber = await generateCalNumber();

    const record = await db.calibrationRecord.create({
      data: {
        calibrationNumber,
        title: title || `Calibration - ${instrumentName}`,
        description,
        instrumentName,
        serialNumber,
        calibrationDate: calibrationDate ? new Date(calibrationDate) : new Date(),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        status: status || 'calibrated',
        standardUsed,
        result,
        asFound: asFound ? JSON.stringify(asFound) : null,
        asLeft: asLeft ? JSON.stringify(asLeft) : null,
        uncertainty: uncertainty ? parseFloat(uncertainty) : null,
        performedById: session.userId,
        notes,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'calibration',
        entityId: record.id,
        newValues: JSON.stringify({ calibrationNumber, instrumentName }),
      },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create calibration record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
