import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { isSuperAdmin, SuperAdminRequiredError } from '@/lib/super-admin';
import {
  enableModuleLicensingEnforcement,
  getModuleLicensingEnforcement,
  MODULE_LICENSING_ENFORCEMENT_CONFIRMATION,
} from '@/services/moduleLicensingEnforcement.service';
import { ModuleLicensingError } from '@/services/moduleLicensing.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const superAdmin = await isSuperAdmin(session);
    if (!superAdmin && !isAdmin(session) && !hasPermission(session, 'modules.view')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const state = await getModuleLicensingEnforcement();
    return NextResponse.json({
      success: true,
      data: state,
      canEnableEnforcement: superAdmin && !state.enforced,
      confirmationPhrase: superAdmin && !state.enforced
        ? MODULE_LICENSING_ENFORCEMENT_CONFIRMATION
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read module licensing enforcement state';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const state = await enableModuleLicensingEnforcement({
      session,
      confirmation: typeof body.confirmation === 'string' ? body.confirmation : '',
      reason: typeof body.reason === 'string' ? body.reason : '',
    });

    return NextResponse.json({ success: true, data: state });
  } catch (error: unknown) {
    if (error instanceof ModuleLicensingError || error instanceof SuperAdminRequiredError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to enable module licensing enforcement';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
