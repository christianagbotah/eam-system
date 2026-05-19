import { NextRequest } from 'next/server';
import { silService } from '@/services/reliability/sil.service';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';

// GET /api/reliability/sil — list SIL assessments or get reference data
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return handleApiError(new UnauthorizedError());

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return handleApiError(new ForbiddenError());
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');

    if (view === 'reference') {
      return Response.json({
        success: true,
        data: {
          silRequirements: silService.getSilRequirements(),
          architectures: silService.getArchitectures(),
          sffRequirements: silService.getSffRequirements(),
        },
      });
    }

    const result = await silService.listAssessments({
      assetId: searchParams.get('assetId') || undefined,
      silTarget: searchParams.get('silTarget') ? parseInt(searchParams.get('silTarget')!) : undefined,
      status: searchParams.get('status') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/reliability/sil — create SIL assessment
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return handleApiError(new UnauthorizedError());

    if (!isAdmin(session)) {
      return handleApiError(new ForbiddenError('Only admins can create SIL assessments'));
    }

    const body = await request.json();
    const { assetId, sifName, sifDescription, silTarget, architecture,
            proofTestIntervalMonths, demandRate, components, lopaLayers, notes } = body;

    if (!assetId || !sifName) {
      return handleApiError(new ValidationError({
        assetId: !assetId ? 'assetId is required' : undefined,
        sifName: !sifName ? 'sifName is required' : undefined,
      }));
    }
    if (!silTarget || silTarget < 1 || silTarget > 4) {
      return handleApiError(new ValidationError({ silTarget: 'silTarget must be 1, 2, 3, or 4' }));
    }

    const result = await silService.createAssessment({
      assetId, sifName, sifDescription, silTarget, architecture,
      proofTestIntervalMonths, demandRate, components, lopaLayers, notes,
      assessedById: session.userId,
    });

    return Response.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
