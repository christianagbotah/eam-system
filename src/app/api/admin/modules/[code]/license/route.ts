import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { SuperAdminRequiredError } from '@/lib/super-admin';
import {
  grantModuleLicense,
  ModuleLicensingError,
  revokeModuleLicense,
} from '@/services/moduleLicensing.service';

function parseOptionalDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ModuleLicensingError('INVALID_DATE', `${field} must be an ISO date string or null`, 400);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ModuleLicensingError('INVALID_DATE', `${field} must be a valid ISO date`, 400);
  }
  return date;
}

function errorResponse(error: unknown) {
  if (error instanceof ModuleLicensingError || error instanceof SuperAdminRequiredError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : 'Module licensing operation failed';
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

/** Grant or replace an installation-wide module license. Super Admin only. */
export async function PUT(
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
    const subscription = body.subscription;
    if (subscription !== undefined && subscription !== null && (typeof subscription !== 'object' || Array.isArray(subscription))) {
      throw new ModuleLicensingError('INVALID_SUBSCRIPTION', 'subscription must be an object or null', 400);
    }

    const state = await grantModuleLicense({
      session,
      code,
      licenseKey: typeof body.licenseKey === 'string' ? body.licenseKey : null,
      validFrom: parseOptionalDate(body.validFrom, 'validFrom'),
      validUntil: parseOptionalDate(body.validUntil, 'validUntil'),
      reason: typeof body.reason === 'string' ? body.reason : null,
      subscription: subscription as Record<string, unknown> | null | undefined,
    });

    return NextResponse.json({ success: true, data: state });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

/** Revoke a license and force the module disabled. Super Admin only. */
export async function DELETE(
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
    const reason = typeof body.reason === 'string' ? body.reason : '';

    const state = await revokeModuleLicense({ session, code, reason });
    return NextResponse.json({ success: true, data: state });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
