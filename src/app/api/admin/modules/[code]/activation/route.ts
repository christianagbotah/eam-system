import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ModuleLicensingError, setModuleActivation } from '@/services/moduleLicensing.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { code } = await params;
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (typeof body.enabled !== 'boolean') {
      throw new ModuleLicensingError('ENABLED_REQUIRED', 'enabled must be a boolean', 400);
    }

    const state = await setModuleActivation({
      session,
      code,
      enabled: body.enabled,
      reason: typeof body.reason === 'string' ? body.reason : null,
    });

    return NextResponse.json({ success: true, data: state });
  } catch (error: unknown) {
    if (error instanceof ModuleLicensingError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to change module activation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
