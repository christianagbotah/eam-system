import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPlantScope, getPlantFilterWhere } from '@/lib/plant-scope';
import { notifyUser } from '@/lib/notifications';

/**
 * GET /api/inventory/alerts
 *
 * Returns items that are at or below their minimum stock level (low stock alerts).
 * Supports plant scoping and threshold filtering.
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const plantScope = await getPlantScope(request, session);
    const plantFilter = getPlantFilterWhere(plantScope);

    // Get all active items and filter for low stock in-memory
    // (Prisma doesn't support comparing two columns in where clause)
    const items = await db.inventoryItem.findMany({
      where: {
        isActive: true,
        ...plantFilter,
      },
      include: {
        plant: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Filter items where currentStock <= minStockLevel
    const lowStockItems = items
      .filter((item) => item.currentStock <= item.minStockLevel)
      .map((item) => {
        const deficit = item.minStockLevel - item.currentStock;
        const reorderQty = item.reorderQuantity || item.minStockLevel;
        const reorderCost = reorderQty * (item.unitCost || 0);
        return {
          ...item,
          deficit: Math.round(deficit * 100) / 100,
          reorderQty,
          reorderCost: Math.round(reorderCost * 100) / 100,
          stockPercent: item.minStockLevel > 0
            ? Math.round((item.currentStock / item.minStockLevel) * 100)
            : 0,
        };
      });

    // Sort by severity (lowest stock percentage first)
    lowStockItems.sort((a, b) => a.stockPercent - b.stockPercent);

    // Group by category for summary
    const byCategory: Record<string, number> = {};
    for (const item of lowStockItems) {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    }

    // Calculate total reorder value
    const totalReorderValue = lowStockItems.reduce((sum, item) => sum + item.reorderCost, 0);

    // Severity breakdown
    const outOfStock = lowStockItems.filter((i) => i.currentStock === 0).length;
    const critical = lowStockItems.filter((i) => i.stockPercent > 0 && i.stockPercent <= 25).length;
    const warning = lowStockItems.filter((i) => i.stockPercent > 25 && i.stockPercent <= 75).length;
    const watch = lowStockItems.filter((i) => i.stockPercent > 75).length;

    return NextResponse.json({
      success: true,
      data: {
        items: lowStockItems,
        summary: {
          total: lowStockItems.length,
          outOfStock,
          critical,
          warning,
          watch,
          totalReorderValue: Math.round(totalReorderValue * 100) / 100,
          byCategory,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load inventory alerts';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
