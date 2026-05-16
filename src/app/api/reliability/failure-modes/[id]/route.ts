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
    const failureMode = await reliabilityEngineeringService.getFailureMode(id);

    return Response.json({ success: true, data: failureMode });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return handleApiError(new UnauthorizedError());
    }

    if (!isAdmin(session)) {
      return handleApiError(new ForbiddenError('Only admins can update failure modes'));
    }

    const { id } = await params;
    const body = await request.json();

    const updated = await reliabilityEngineeringService.updateFailureMode(id, body);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return handleApiError(new UnauthorizedError());
    }

    if (!isAdmin(session)) {
      return handleApiError(new ForbiddenError('Only admins can delete failure modes'));
    }

    const { id } = await params;
    await reliabilityEngineeringService.deleteFailureMode(id);

    return Response.json({ success: true, message: 'Failure mode deleted' });
  } catch (error) {
    return handleApiError(error);
  }
}
