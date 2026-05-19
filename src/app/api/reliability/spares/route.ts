import { NextRequest } from 'next/server';
import { spareOptimizationService } from '@/services/reliability/spareOptimization.service';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';

// GET /api/reliability/spares — list optimizations, get summary, or get reference data
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return handleApiError(new UnauthorizedError());

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return handleApiError(new ForbiddenError());
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');

    // Summary dashboard
    if (view === 'summary') {
      const summary = await spareOptimizationService.getSummary();
      return Response.json({ success: true, data: summary });
    }

    // Reference data
    if (view === 'reference') {
      return Response.json({
        success: true,
        data: {
          abc: spareOptimizationService.getAbcDescription(),
          xyz: spareOptimizationService.getXyzDescription(),
        },
      });
    }

    // Default: list optimizations
    const result = await spareOptimizationService.listOptimizations({
      abcClassification: searchParams.get('abcClassification') || undefined,
      xyzClassification: searchParams.get('xyzClassification') || undefined,
      criticality: searchParams.get('criticality') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/reliability/spares — analyze single or bulk optimize spare parts
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return handleApiError(new UnauthorizedError());

    if (!isAdmin(session)) {
      return handleApiError(new ForbiddenError('Only admins can run spare optimization'));
    }

    const body = await request.json();
    const { mode } = body;

    // Single item analysis
    if (mode === 'single' || !mode) {
      const { inventoryItemId, annualDemand, unitCost, holdingCostPercent,
              orderingCost, leadTimeDays, serviceLevel, currentStock, analysisPeriod } = body;

      if (!inventoryItemId) {
        return handleApiError(new ValidationError({ inventoryItemId: 'inventoryItemId is required' }));
      }

      const result = await spareOptimizationService.analyzeSparePart({
        inventoryItemId, annualDemand, unitCost, holdingCostPercent,
        orderingCost, leadTimeDays, serviceLevel, currentStock, analysisPeriod,
      });

      return Response.json({ success: true, data: result }, { status: 201 });
    }

    // Bulk optimization
    if (mode === 'bulk') {
      const { inventoryItemIds, serviceLevel, holdingCostPercent } = body;

      if (!inventoryItemIds?.length) {
        return handleApiError(new ValidationError({ inventoryItemIds: 'inventoryItemIds array is required' }));
      }

      if (inventoryItemIds.length > 100) {
        return handleApiError(new ValidationError({ inventoryItemIds: 'Maximum 100 items per bulk request' }));
      }

      const result = await spareOptimizationService.bulkOptimize({
        inventoryItemIds,
        serviceLevel,
        holdingCostPercent,
      });

      return Response.json({ success: true, data: result }, { status: 201 });
    }

    return handleApiError(new ValidationError({ mode: 'mode must be "single" or "bulk"' }));
  } catch (error) {
    return handleApiError(error);
  }
}
