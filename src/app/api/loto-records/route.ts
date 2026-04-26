import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const stats = url.searchParams.get('stats') === 'true';
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const assetId = url.searchParams.get('assetId');
    const departmentId = url.searchParams.get('departmentId');

    if (stats) {
      const where: any = {};

      const [total, pending, approved, inProgress, completed, expired, cancelled, activeWorkers] = await Promise.all([
        db.lotoRecord.count({ where }),
        db.lotoRecord.count({ where: { ...where, status: 'pending' } }),
        db.lotoRecord.count({ where: { ...where, status: 'approved' } }),
        db.lotoRecord.count({ where: { ...where, status: 'in_progress' } }),
        db.lotoRecord.count({ where: { ...where, status: 'completed' } }),
        db.lotoRecord.count({ where: { ...where, status: 'expired' } }),
        db.lotoRecord.count({ where: { ...where, status: 'cancelled' } }),
        db.lotoRecord.aggregate({ _sum: { workerCount: true }, where: { ...where, status: { in: ['approved', 'in_progress'] } } }).then(r => r._sum.workerCount || 0),
      ]);

      return NextResponse.json({
        success: true,
        stats: { total, pending, approved, inProgress, completed, expired, cancelled, activeWorkers },
      });
    }

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (assetId) where.assetId = assetId;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { lotoNumber: { contains: search } },
        { description: { contains: search } },
        { energySourceDesc: { contains: search } },
      ];
    }

    const records = await db.lotoRecord.findMany({
      where,
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        supervisor: { select: { id: true, fullName: true } },
        safetyOfficer: { select: { id: true, fullName: true } },
        asset: { select: { id: true, name: true, assetTag: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch LOTO records';
    console.error('LOTO GET error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(session, 'safety.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, assetId, departmentId, lotoType, energySource, energySourceDesc, scheduledDate, requiredFromDate, requiredToDate, isolationPoints, affectedWorkers, workerCount, notes } = body;

    if (!title) return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    if (!energySource) return NextResponse.json({ success: false, error: 'Energy source is required' }, { status: 400 });

    // Generate LOTO number: LOTO-YYYYMM-NNNN
    const now = new Date();
    const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await db.lotoRecord.count({
      where: { lotoNumber: { startsWith: `LOTO-${monthStr}` } },
    });
    const lotoNumber = `LOTO-${monthStr}-${String(count + 1).padStart(4, '0')}`;

    const record = await db.lotoRecord.create({
      data: {
        lotoNumber,
        title,
        description: description || null,
        assetId: assetId || null,
        departmentId: departmentId || null,
        lotoType: lotoType || 'routine',
        energySource,
        energySourceDesc: energySourceDesc || null,
        requestedById: session.userId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        requiredFromDate: requiredFromDate ? new Date(requiredFromDate) : null,
        requiredToDate: requiredToDate ? new Date(requiredToDate) : null,
        isolationPoints: JSON.stringify(isolationPoints || []),
        affectedWorkers: JSON.stringify(affectedWorkers || []),
        workerCount: workerCount || 0,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create LOTO record';
    console.error('LOTO POST error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
