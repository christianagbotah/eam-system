import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/super-admin';
import { getModuleStates } from '@/services/moduleLicensing.service';

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

    const modules = await getModuleStates();
    return NextResponse.json({
      success: true,
      data: modules,
      authority: {
        isSuperAdmin: superAdmin,
        isSystemAdmin: isAdmin(session),
        canGrantOrRevokeLicense: superAdmin,
        canEnableOrDisable: superAdmin || isAdmin(session),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load module licensing state';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
