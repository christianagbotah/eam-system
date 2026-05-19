import { NextRequest } from 'next/server';
import { silService } from '@/services/reliability/sil.service';
import { getSession, isAdmin } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors';

// GET /api/reliability/sil/[id] — get single SIL assessment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) return handleApiError(new UnauthorizedError());
    if (!isAdmin(session)) return handleApiError(new ForbiddenError());

    const { id } = await params;
    const result = await silService.getAssessment(id);
    return Response.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof NotFoundError) return handleApiError(error);
    return handleApiError(error);
  }
}

// PUT /api/reliability/sil/[id] — update SIL assessment
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
    const updated = await silService.updateAssessment(id, body);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof NotFoundError) return handleApiError(error);
    return handleApiError(error);
  }
}

// DELETE /api/reliability/sil/[id] — delete SIL assessment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) return handleApiError(new UnauthorizedError());
    if (!isAdmin(session)) return handleApiError(new ForbiddenError());

    const { id } = await params;
    await silService.deleteAssessment(id);
    return Response.json({ success: true, message: 'SIL assessment deleted' });
  } catch (error) {
    if (error instanceof NotFoundError) return handleApiError(error);
    return handleApiError(error);
  }
}
