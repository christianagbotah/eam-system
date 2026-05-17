import { NextRequest } from 'next/server';
import { reliabilityEngineeringService } from '@/services/reliabilityEngineering.service';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return handleApiError(new UnauthorizedError());
    }

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return handleApiError(new ForbiddenError());
    }

    const { id } = await params;
    const analysis = await reliabilityEngineeringService.getWeibullAnalysis(id);

    return Response.json({ success: true, data: analysis });
  } catch (error) {
    return handleApiError(error);
  }
}
