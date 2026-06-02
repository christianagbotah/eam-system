import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasRole } from '@/lib/auth';
import { getPlantScope, applyPlantScope } from '@/lib/plant-scope';
import { Prisma } from '@prisma/client';

// GET /api/repairs/downtime
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workOrderId = searchParams.get('workOrderId');
    const assetId = searchParams.get('assetId');
    const category = searchParams.get('category');
    const impactLevel = searchParams.get('impactLevel');
    const status = searchParams.get('status'); // 'ongoing' (no endTime) | 'completed'
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};

    // Apply plant scope filter
    const plantScope = await getPlantScope(request, session);
    if (plantScope) {
      applyPlantScope(where, plantScope);
    }
    if (workOrderId) where.workOrderId = workOrderId;
    if (assetId) where.assetId = assetId;
    if (category) where.category = category;
    if (impactLevel) where.impactLevel = impactLevel;
    if (status === 'ongoing') where.downtimeEnd = null;
    if (status === 'completed') where.downtimeEnd = { not: null };

    if (search) {
      where.OR = [
        { assetName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { workOrder: { woNumber: { contains: search, mode: Prisma.QueryMode.insensitive } } },
      ];
    }

    // Scope downtime to user's own WOs unless they have management role
    const hasViewAll = isAdmin(session) || hasRole(session, 'maintenance_supervisor') || hasRole(session, 'maintenance_manager') || hasRole(session, 'maintenance_planner') || hasRole(session, 'plant_manager');
    if (!hasViewAll) {
      // Only show downtime for WOs assigned to this user or where they are a team member
      const userWorkOrders = await db.workOrder.findMany({
        where: { OR: [{ assignedTo: session.userId }, { teamMembers: { some: { userId: session.userId } } }] },
        select: { id: true },
      });
      const woIds = userWorkOrders.map(wo => wo.id);
      if (woIds.length > 0) {
        where.workOrderId = { in: woIds };
      } else {
        where.workOrderId = { in: [] }; // No WOs = no downtime visible
      }
    }

    const [records, total] = await Promise.all([
      db.workOrderDowntime.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.workOrderDowntime.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({ success: true, data: records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load downtime records';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/repairs/downtime
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const canCreate = isAdmin(session) || hasRole(session, 'maintenance_technician') || hasRole(session, 'maintenance_supervisor') || hasRole(session, 'maintenance_planner') || hasRole(session, 'maintenance_manager') || hasRole(session, 'production_operator') || hasRole(session, 'production_manager');
    if (!canCreate) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to create downtime records' }, { status: 403 });
    }

    const body = await request.json();
    const { workOrderId, assetId, assetName, downtimeStart, downtimeEnd, reason, category, impactLevel, productionLoss, notes } = body;

    if (!workOrderId || !assetName || !downtimeStart || !reason) {
      return NextResponse.json({ success: false, error: 'workOrderId, assetName, downtimeStart, and reason are required' }, { status: 400 });
    }

    const wo = await db.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });

    const start = new Date(downtimeStart);
    const end = downtimeEnd ? new Date(downtimeEnd) : null;
    const durationMinutes = end ? Math.max(0, (end.getTime() - start.getTime()) / 60000) : 0;

    const record = await db.workOrderDowntime.create({
      data: {
        workOrderId, assetId: assetId || null, assetName,
        downtimeStart: start, downtimeEnd: end, durationMinutes,
        reason, category: category || 'unplanned', impactLevel: impactLevel || 'medium',
        productionLoss: productionLoss || null, notes: notes || null,
        createdById: session.userId,
      },
      include: { workOrder: { select: { id: true, woNumber: true, title: true } } },
    });

    await db.auditLog.create({
      data: { userId: session.userId, action: 'create', entityType: 'wo_downtime', entityId: record.id, newValues: JSON.stringify({ workOrderId, assetName, durationMinutes, category }) },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create downtime record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
