import { db } from '@/lib/db';
import type { SessionData } from '@/lib/auth';
import { logPrivilegedAction } from '@/lib/audit';
import { requireSuperAdmin } from '@/lib/super-admin';
import {
  ModuleLicensingError,
  requireEnabledLicensedModule,
  type EffectiveModuleState,
} from '@/services/moduleLicensing.service';

const ENFORCEMENT_KEY = 'module_licensing:enforcement';
const CONFIRMATION = 'ENFORCE_MODULE_LICENSING';

export interface ModuleLicensingEnforcementState {
  enforced: boolean;
  enforcedAt: string | null;
  enforcedBySuperAdminId: string | null;
  reason: string | null;
}

const DEFAULT_STATE: ModuleLicensingEnforcementState = {
  enforced: false,
  enforcedAt: null,
  enforcedBySuperAdminId: null,
  reason: null,
};

function parseState(value: string | null | undefined): ModuleLicensingEnforcementState {
  if (!value) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(value) as Partial<ModuleLicensingEnforcementState>;
    return {
      enforced: parsed.enforced === true,
      enforcedAt: typeof parsed.enforcedAt === 'string' ? parsed.enforcedAt : null,
      enforcedBySuperAdminId: typeof parsed.enforcedBySuperAdminId === 'string'
        ? parsed.enforcedBySuperAdminId
        : null,
      reason: typeof parsed.reason === 'string' ? parsed.reason : null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

/**
 * Existing installations default to legacy-uninitialized mode so deploying the
 * licensing code cannot accidentally lock every module before provisioning.
 */
export async function getModuleLicensingEnforcement(): Promise<ModuleLicensingEnforcementState> {
  const config = await db.systemConfig.findUnique({
    where: { key: ENFORCEMENT_KEY },
    select: { config: true },
  });
  return parseState(config?.config);
}

/**
 * One-way cutover. Only Super Admin can initialize enforcement, and there is
 * intentionally no disable API. This avoids a System Admin bypassing licenses
 * after an installation has been brought under license control.
 */
export async function enableModuleLicensingEnforcement(params: {
  session: SessionData;
  confirmation: string;
  reason: string;
}): Promise<ModuleLicensingEnforcementState> {
  await requireSuperAdmin(params.session);

  if (params.confirmation !== CONFIRMATION) {
    throw new ModuleLicensingError(
      'ENFORCEMENT_CONFIRMATION_REQUIRED',
      `confirmation must equal '${CONFIRMATION}'`,
      400,
    );
  }
  if (!params.reason?.trim()) {
    throw new ModuleLicensingError('REASON_REQUIRED', 'An enforcement reason is required', 400);
  }

  const current = await getModuleLicensingEnforcement();
  if (current.enforced) return current;

  const next: ModuleLicensingEnforcementState = {
    enforced: true,
    enforcedAt: new Date().toISOString(),
    enforcedBySuperAdminId: params.session.userId,
    reason: params.reason.trim(),
  };

  await db.systemConfig.upsert({
    where: { key: ENFORCEMENT_KEY },
    create: { key: ENFORCEMENT_KEY, config: JSON.stringify(next) },
    update: { config: JSON.stringify(next) },
  });

  await logPrivilegedAction({
    userId: params.session.userId,
    action: 'module.licensing.enforce',
    resourceType: 'SystemConfig',
    resourceId: ENFORCEMENT_KEY,
    beforeState: current as unknown as Record<string, unknown>,
    afterState: next as unknown as Record<string, unknown>,
    metadata: { reason: params.reason.trim(), irreversible: true },
  });

  return next;
}

/**
 * Runtime module guard used by domain routes/layouts during staged rollout.
 * Before installation cutover it returns null (legacy compatibility). After
 * cutover it fails closed unless the module is both licensed and enabled.
 */
export async function requireModuleAccessIfEnforced(code: string): Promise<EffectiveModuleState | null> {
  const enforcement = await getModuleLicensingEnforcement();
  if (!enforcement.enforced) return null;
  return requireEnabledLicensedModule(code);
}

export async function isModuleAccessAllowed(code: string): Promise<boolean> {
  const enforcement = await getModuleLicensingEnforcement();
  if (!enforcement.enforced) return true;
  try {
    await requireEnabledLicensedModule(code);
    return true;
  } catch {
    return false;
  }
}

export const MODULE_LICENSING_ENFORCEMENT_CONFIRMATION = CONFIRMATION;
