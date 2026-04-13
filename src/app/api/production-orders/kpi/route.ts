import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPlantScope, getPlantFilterWhere } from '@/lib/plant-scope';

/**
 * GET /api/production-orders/kpi
 *
 * Production KPIs: throughput, OEE approximation, order status breakdown,
 * on-time delivery, yield rates, cost metrics.
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const plantScope = await getPlantScope(request, session);
    const plantFilter = getPlantFilterWhere(plantScope);

    const pf = plantFilter;

    const [
      statusCounts,
      totalOrders,
      completedOrders,
      overdueOrders,
      activeBatches,
      avgYield,
      totalValue,
      totalCompletedValue,
      recentCompletions,
    ] = await Promise.all([
      // Status breakdown
      db.productionOrder.groupBy({
        by: ['status'],
        where: Object.keys(pf).length > 0 ? pf : undefined,
        _count: { status: true },
      }),
      // Total orders
      db.productionOrder.count({ where: Object.keys(pf).length > 0 ? pf : undefined }),
      // Completed orders
      db.productionOrder.count({
        where: { status: 'completed', ...pf },
      }),
      // Overdue orders (scheduled end < now, not completed/cancelled)
      db.productionOrder.count({
        where: {
          ...pf,
          scheduledEnd: { lt: new Date() },
          status: { notIn: ['completed', 'cancelled'] },
        },
      }),
      // Active batches (in_progress)
      db.productionBatch.count({
        where: { status: 'in_progress' },
      }),
      // Average yield from completed batches
      db.productionBatch.aggregate({
        where: {
          status: 'completed',
          yield_: { not: null },
        },
        _avg: { yield_: true },
        _count: true,
      }),
      // Total order value (open orders)
      db.productionOrder.aggregate({
        where: {
          ...pf,
          status: { notIn: ['completed', 'cancelled'] },
          unitCost: { not: null },
          quantity: { gt: 0 },
        },
        _sum: { quantity: true },
        _avg: { unitCost: true },
        _count: true,
      }),
      // Total completed value
      db.productionOrder.aggregate({
        where: {
          ...pf,
          status: 'completed',
          unitCost: { not: null },
        },
        _sum: { quantity: true, completedQty: true },
        _avg: { unitCost: true },
      }),
      // Completed this month
      db.productionOrder.count({
        where: {
          ...pf,
          status: 'completed',
          actualEnd: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    // Build status map
    const byStatus: Record<string, number> = {};
    statusCounts.forEach((s) => { byStatus[s.status] = s._count.status; });

    // On-time delivery rate
    const onTimeOrders = await db.productionOrder.count({
      where: {
        ...pf,
        status: 'completed',
        actualEnd: { not: null },
        scheduledEnd: { not: null },
      },
    });
    const deliveredOnTime = await db.productionOrder.count({
      where: {
        ...pf,
        status: 'completed',
        actualEnd: { not: null },
        scheduledEnd: { not: null },
        actualEnd: { lte: db.productionOrder.fields.scheduledEnd },
      },
    });
    const onTimeRate = onTimeOrders > 0 ? Math.round((deliveredOnTime / onTimeOrders) * 100) : 0;

    // Completion rate
    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

    // Open order value
    const openOrderValue = totalValue._sum.quantity && totalValue._avg.unitCost
      ? Math.round(totalValue._sum.quantity * totalValue._avg.unitCost)
      : 0;

    // Completed order value
    const completedValue = totalCompletedValue._sum.completedQty && totalCompletedValue._avg.unitCost
      ? Math.round(totalCompletedValue._sum.completedQty * totalCompletedValue._avg.unitCost)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        total: totalOrders,
        byStatus,
        overdue: overdueOrders,
        activeBatches,
        completionRate,
        onTimeDeliveryRate: onTimeRate,
        avgYield: avgYield._avg.yield_ ? Math.round(avgYield._avg.yield_ * 100) / 100 : 0,
        completedThisMonth: recentCompletions,
        openOrderValue,
        completedValue,
        metrics: {
          totalOpen: totalOrders - completedOrders - (byStatus['cancelled'] || 0),
          avgUnitCost: totalValue._avg.unitCost ? Math.round(totalValue._avg.unitCost * 100) / 100 : 0,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load production KPIs';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
