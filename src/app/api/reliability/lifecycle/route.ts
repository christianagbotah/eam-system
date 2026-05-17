import { NextRequest } from 'next/server';
import { lifecycleForecastService } from '@/services/reliability/lifecycleForecast.service';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';

// GET /api/reliability/lifecycle — list forecasts, maintenance cost forecast, replacement analysis, or CAPEX plan
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return handleApiError(new UnauthorizedError());

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return handleApiError(new ForbiddenError());
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');

    // Maintenance cost forecast
    if (view === 'maintenance-cost') {
      const assetId = searchParams.get('assetId');
      if (!assetId) {
        return handleApiError(new ValidationError({ assetId: 'assetId is required' }));
      }
      const period = parseInt(searchParams.get('periodMonths') || '12');
      const result = await lifecycleForecastService.forecastMaintenanceCosts(assetId, period);
      return Response.json({ success: true, data: result });
    }

    // Replacement analysis
    if (view === 'replacement') {
      const assetId = searchParams.get('assetId');
      const replacementCost = searchParams.get('replacementCost');
      if (!assetId) {
        return handleApiError(new ValidationError({ assetId: 'assetId is required' }));
      }
      const result = await lifecycleForecastService.analyzeReplacement(
        assetId,
        replacementCost ? parseFloat(replacementCost) : undefined,
      );
      return Response.json({ success: true, data: result });
    }

    // Health trajectory
    if (view === 'health-trajectory') {
      const assetId = searchParams.get('assetId');
      if (!assetId) {
        return handleApiError(new ValidationError({ assetId: 'assetId is required' }));
      }
      const period = parseInt(searchParams.get('periodMonths') || '36');
      const trajectory = await lifecycleForecastService.predictHealthTrajectory(assetId, period);
      return Response.json({ success: true, data: trajectory });
    }

    // CAPEX planning
    if (view === 'capex') {
      const plantId = searchParams.get('plantId') || undefined;
      const result = await lifecycleForecastService.capexPlanning(plantId);
      return Response.json({ success: true, data: result });
    }

    // Default: list forecasts
    const result = await lifecycleForecastService.listForecasts({
      assetId: searchParams.get('assetId') || undefined,
      forecastType: searchParams.get('forecastType') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/reliability/lifecycle — compute TCO
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return handleApiError(new UnauthorizedError());

    if (!isAdmin(session)) {
      return handleApiError(new ForbiddenError('Only admins can compute lifecycle forecasts'));
    }

    const body = await request.json();
    const { assetId, forecastPeriodMonths, acquisitionCost, annualOperatingCost,
            annualMaintenanceCost, disposalCost, discountRate, expectedLifeYears } = body;

    if (!assetId) {
      return handleApiError(new ValidationError({ assetId: 'assetId is required' }));
    }

    const result = await lifecycleForecastService.computeTCO({
      assetId,
      forecastPeriodMonths,
      acquisitionCost,
      annualOperatingCost,
      annualMaintenanceCost,
      disposalCost,
      discountRate,
      expectedLifeYears,
    });

    return Response.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
