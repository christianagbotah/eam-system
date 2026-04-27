import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const shiftType = searchParams.get('shiftType');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (shiftType) where.shiftType = shiftType;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { handedOverBy: { fullName: { contains: search } } },
        { receivedBy: { fullName: { contains: search } } },
        { notes: { contains: search } },
        { safetyNotes: { contains: search } },
      ];
    }

    const [handovers, total] = await Promise.all([
      db.shiftHandover.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          handedOverBy: { select: { id: true, fullName: true, username: true } },
          receivedBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { shiftDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.shiftHandover.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // KPI counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalCount, todayCount, pendingCount, confirmedCount] = await Promise.all([
      db.shiftHandover.count(),
      db.shiftHandover.count({ where: { shiftDate: { gte: today, lt: tomorrow } } }),
      db.shiftHandover.count({ where: { status: 'pending' } }),
      db.shiftHandover.count({ where: { status: 'confirmed' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: handovers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      kpis: {
        total: totalCount,
        today: todayCount,
        pending: pendingCount,
        confirmed: confirmedCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load shift handovers';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'operations.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { shiftType, shiftDate, fromShift, toShift, departmentId, receivedById, tasksSummary, pendingIssues, safetyNotes, equipmentStatus, notes } = body;

    if (!shiftType) {
      return NextResponse.json({ success: false, error: 'Shift type is required' }, { status: 400 });
    }

    // Parse structured fields as JSON
    let parsedTasks: string | null = null;
    let parsedIssues: string | null = null;
    let parsedEquipment: string | null = null;

    if (tasksSummary) {
      if (typeof tasksSummary === 'string') {
        parsedTasks = JSON.stringify([{ task: tasksSummary }]);
      } else if (Array.isArray(tasksSummary)) {
        parsedTasks = JSON.stringify(tasksSummary);
      } else {
        parsedTasks = JSON.stringify(tasksSummary);
      }
    }

    if (pendingIssues) {
      if (typeof pendingIssues === 'string') {
        parsedIssues = JSON.stringify([{ issue: pendingIssues }]);
      } else if (Array.isArray(pendingIssues)) {
        parsedIssues = JSON.stringify(pendingIssues);
      } else {
        parsedIssues = JSON.stringify(pendingIssues);
      }
    }

    if (equipmentStatus) {
      if (typeof equipmentStatus === 'string') {
        parsedEquipment = JSON.stringify([{ status: equipmentStatus }]);
      } else if (Array.isArray(equipmentStatus)) {
        parsedEquipment = JSON.stringify(equipmentStatus);
      } else {
        parsedEquipment = JSON.stringify(equipmentStatus);
      }
    }

    const handover = await db.shiftHandover.create({
      data: {
        shiftDate: shiftDate ? new Date(shiftDate) : new Date(),
        shiftType: shiftType.toLowerCase(),
        fromShift: fromShift || null,
        toShift: toShift || null,
        departmentId: departmentId || null,
        handedOverById: session.userId,
        receivedById: receivedById || null,
        tasksSummary: parsedTasks || JSON.stringify([]),
        pendingIssues: parsedIssues || JSON.stringify([]),
        safetyNotes: safetyNotes || null,
        equipmentStatus: parsedEquipment || null,
        notes: notes || null,
      },
      include: {
        handedOverBy: { select: { id: true, fullName: true, username: true } },
        receivedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'shift_handover',
        entityId: handover.id,
        newValues: JSON.stringify({ shiftType, shiftDate: handover.shiftDate }),
      },
    });

    return NextResponse.json({ success: true, data: handover }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create shift handover';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
