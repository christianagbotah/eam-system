import { NextRequest } from 'next/server';
import { rbiService } from '@/services/reliability/rbi.service';
import { getSession, isAdmin } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors';

// GET /api/reliability/rbi/[id] — get single assessment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) return handleApiError(new UnauthorizedError());
    if (!isAdmin(session)) return handleApiError(new ForbiddenError());

    const { id } = await params;
    const assessment = await rbiService.getAssessment(id);
    return Response.json({ success: true, data: assessment });
  } catch (error) {
    if (error instanceof NotFoundError) return handleApiError(error);
    return handleApiError(error);
  }
}

// PUT /api/reliability/rbi/[id] — update assessment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) return handleApiError(new UnauthorizedError());
    if (!isAdmin(session)) return handleApiError(new ForbiddenError());

    const { id } = await params;
    const body = await request.json();
    const updated = await rbiService.updateAssessment(id, body);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof NotFoundError) return handleApiError(error);
    return handleApiError(error);
  }
}

// DELETE /api/reliability/rbi/[id] — delete assessment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) return handleApiError(new UnauthorizedError());
    if (!isAdmin(session)) return handleApiError(new ForbiddenError());

    const { id } = await params;
    await rbiService.deleteAssessment(id);
    return Response.json({ success: true, message: 'RBI assessment deleted' });
  } catch (error) {
    if (error instanceof NotFoundError) return handleApiError(error);
    return handleApiError(error);
  }
}
