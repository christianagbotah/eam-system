import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper: generate reading number MR-OPS-YYYYMM-NNNN
async function generateReadingNumber(): Promise<string> {
  const now = new Date();
  const prefix = `MR-OPS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.meterReading.findFirst({
    where: { readingNumber: { startsWith: prefix } },
    orderBy: { readingNumber: 'desc' },
    select: { readingNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.readingNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const meterName = searchParams.get('meterName');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (meterName) where.meterName = { contains: meterName };
    if (search) {
      where.OR = [
        { meterName: { contains: search } },
        { readingNumber: { contains: search } },
        { unit: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const [readings, total] = await Promise.all([
      db.meterReading.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          readBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { readingDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.meterReading.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const [totalCount, thisMonthCount, anomalyCount] = await Promise.all([
      db.meterReading.count(),
      db.meterReading.count({
        where: {
          readingDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      db.meterReading.count({
        where: {
          consumption: { gt: 0 },
        },
      }),
    ]);

    // Distinct meter names
    const metersResult = await db.meterReading.findMany({
      distinct: ['meterName'],
      select: { meterName: true },
    });

    return NextResponse.json({
      success: true,
      data: readings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      kpis: {
        total: totalCount,
        metersTracked: metersResult.length,
        thisMonth: thisMonthCount,
        withConsumption: anomalyCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load meter readings';
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
    const { meterName, value, unit, readingDate, notes } = body;

    if (!meterName) {
      return NextResponse.json({ success: false, error: 'Meter name is required' }, { status: 400 });
    }
    if (value === undefined || value === null || isNaN(Number(value))) {
      return NextResponse.json({ success: false, error: 'Reading value is required' }, { status: 400 });
    }
    if (!unit) {
      return NextResponse.json({ success: false, error: 'Unit is required' }, { status: 400 });
    }

    const readingNumber = await generateReadingNumber();
    const readingValue = Number(value);

    // Look for previous reading for same meter
    const previousReading = await db.meterReading.findFirst({
      where: { meterName },
      orderBy: { readingDate: 'desc' },
      select: { value: true },
    });

    const previousValue = previousReading?.value ?? null;
    const consumption = previousValue !== null ? readingValue - previousValue : null;

    const reading = await db.meterReading.create({
      data: {
        readingNumber,
        meterName,
        value: readingValue,
        unit,
        readingDate: readingDate ? new Date(readingDate) : new Date(),
        previousValue,
        consumption,
        notes: notes || null,
        readById: session.userId,
      },
      include: {
        readBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'meter_reading',
        entityId: reading.id,
        newValues: JSON.stringify({ readingNumber, meterName, value: readingValue, unit }),
      },
    });

    return NextResponse.json({ success: true, data: reading }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create meter reading';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
