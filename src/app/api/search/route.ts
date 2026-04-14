import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPlantScope } from '@/lib/plant-scope';

// ============================================================================
// GLOBAL SEARCH — Multi-entity search endpoint
// ============================================================================

const VALID_TYPES = ['assets', 'work_orders', 'maintenance_requests', 'inventory', 'users'];

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  status?: string;
  meta?: string;
}

interface SearchGroup {
  type: string;
  label: string;
  count: number;
  results: SearchResult[];
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const typesParam = searchParams.get('types') || '';

    if (!query) {
      return NextResponse.json({
        success: true,
        data: { query: '', results: [], total: 0 },
      });
    }

    const types = typesParam
      ? typesParam.split(',').map((t) => t.trim()).filter((t) => VALID_TYPES.includes(t))
      : VALID_TYPES;

    // Resolve plant scope
    const plantScope = await getPlantScope(request, session);

    // Build parallel search queries
    const searches: Promise<SearchGroup>[] = [];

    if (types.includes('assets')) {
      searches.push(
        db.asset
          .findMany({
            where: {
              AND: [
                { isActive: true },
                plantScope.isScoped && plantScope.plantId ? { plantId: plantScope.plantId } : {},
                {
                  OR: [
                    { name: { contains: query } },
                    { assetTag: { contains: query } },
                    { serialNumber: { contains: query } },
                  ],
                },
              ],
            },
            select: {
              id: true,
              name: true,
              assetTag: true,
              status: true,
              condition: true,
              location: true,
            },
            take: limit,
            orderBy: { name: 'asc' },
          })
          .then((items) => ({
            type: 'assets',
            label: 'Assets',
            count: items.length,
            results: items.map((a) => ({
              id: a.id,
              type: 'assets',
              title: a.name,
              subtitle: a.assetTag,
              status: a.status,
              meta: a.location || a.condition,
            })),
          }))
      );
    }

    if (types.includes('work_orders')) {
      searches.push(
        db.workOrder
          .findMany({
            where: {
              AND: [
                { status: { not: 'cancelled' } },
                plantScope.isScoped && plantScope.plantId ? { plantId: plantScope.plantId } : {},
                {
                  OR: [
                    { title: { contains: query } },
                    { woNumber: { contains: query } },
                  ],
                },
              ],
            },
            select: {
              id: true,
              woNumber: true,
              title: true,
              status: true,
              priority: true,
              type: true,
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
          })
          .then((items) => ({
            type: 'work_orders',
            label: 'Work Orders',
            count: items.length,
            results: items.map((w) => ({
              id: w.id,
              type: 'work_orders',
              title: w.title,
              subtitle: w.woNumber,
              status: w.status,
              meta: `${w.priority} · ${w.type}`,
            })),
          }))
      );
    }

    if (types.includes('maintenance_requests')) {
      searches.push(
        db.maintenanceRequest
          .findMany({
            where: {
              AND: [
                { status: { not: 'rejected' } },
                plantScope.isScoped && plantScope.plantId ? { plantId: plantScope.plantId } : {},
                {
                  OR: [
                    { title: { contains: query } },
                    { requestNumber: { contains: query } },
                  ],
                },
              ],
            },
            select: {
              id: true,
              requestNumber: true,
              title: true,
              status: true,
              priority: true,
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
          })
          .then((items) => ({
            type: 'maintenance_requests',
            label: 'Maintenance Requests',
            count: items.length,
            results: items.map((m) => ({
              id: m.id,
              type: 'maintenance_requests',
              title: m.title,
              subtitle: m.requestNumber,
              status: m.status,
              meta: m.priority,
            })),
          }))
      );
    }

    if (types.includes('inventory')) {
      searches.push(
        db.inventoryItem
          .findMany({
            where: {
              AND: [
                { isActive: true },
                plantScope.isScoped && plantScope.plantId ? { plantId: plantScope.plantId } : {},
                {
                  OR: [
                    { name: { contains: query } },
                    { itemCode: { contains: query } },
                    { supplier: { contains: query } },
                  ],
                },
              ],
            },
            select: {
              id: true,
              itemCode: true,
              name: true,
              category: true,
              currentStock: true,
              minStockLevel: true,
              unitOfMeasure: true,
            },
            take: limit,
            orderBy: { name: 'asc' },
          })
          .then((items) => ({
            type: 'inventory',
            label: 'Inventory Items',
            count: items.length,
            results: items.map((i) => ({
              id: i.id,
              type: 'inventory',
              title: i.name,
              subtitle: i.itemCode,
              meta: `${i.currentStock} ${i.unitOfMeasure} · ${i.category}`,
            })),
          }))
      );
    }

    if (types.includes('users')) {
      searches.push(
        db.user
          .findMany({
            where: {
              AND: [
                { status: 'active' },
                {
                  OR: [
                    { fullName: { contains: query } },
                    { username: { contains: query } },
                    { email: { contains: query } },
                  ],
                  ...(query.length >= 3 && /^[A-Z0-9-]+$/i.test(query)
                    ? [{ staffId: { contains: query } }]
                    : []),
                },
              ],
            },
            select: {
              id: true,
              fullName: true,
              username: true,
              staffId: true,
              department: true,
              status: true,
            },
            take: limit,
            orderBy: { fullName: 'asc' },
          })
          .then((items) => ({
            type: 'users',
            label: 'Users',
            count: items.length,
            results: items.map((u) => ({
              id: u.id,
              type: 'users',
              title: u.fullName,
              subtitle: u.username,
              meta: u.department || u.staffId || '',
            })),
          }))
      );
    }

    const groups = await Promise.all(searches);
    const total = groups.reduce((sum, g) => sum + g.count, 0);

    return NextResponse.json({
      success: true,
      data: {
        query,
        results: groups,
        total,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
