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
    const analysis = await reliabilityEngineeringService.getRcmAnalysis(id);

    return Response.json({ success: true, data: analysis });
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
      return handleApiError(new ForbiddenError('Only admins can update RCM analyses'));
    }

    const { id } = await params;
    const body = await request.json();

    // Set approved info if status is being changed to approved
    if (body.status === 'approved') {
      body.approvedById = session.userId;
      body.approvedAt = new Date().toISOString();
    }

    const updated = await reliabilityEngineeringService.updateRcmAnalysis(id, body);
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
      return handleApiError(new ForbiddenError('Only admins can delete RCM analyses'));
    }

    const { id } = await params;
    await reliabilityEngineeringService.deleteRcmAnalysis(id);

    return Response.json({ success: true, message: 'RCM analysis deleted' });
  } catch (error) {
    return handleApiError(error);
  }
}
