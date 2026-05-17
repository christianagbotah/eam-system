import { NextRequest } from 'next/server';
import { reliabilityEngineeringService } from '@/services/reliabilityEngineering.service';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return handleApiError(new UnauthorizedError());
    }

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return handleApiError(new ForbiddenError());
    }

    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get('plantId') || undefined;

    const result = await reliabilityEngineeringService.getAssetCriticalityRanking(plantId);
    return Response.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
