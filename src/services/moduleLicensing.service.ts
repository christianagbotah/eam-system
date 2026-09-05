import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { isAdmin, type SessionData } from '@/lib/auth';
import { isSuperAdmin, requireSuperAdmin } from '@/lib/super-admin';
import { createAuditLog, logPrivilegedAction } from '@/lib/audit';

export interface ModuleCatalogDefinition {
  code: string;
  name: string;
  description: string;
  version: string;
  isCore: boolean;
}

/**
 * Installation-wide module catalog. Codes are deliberately domain-oriented
 * and never include a plant/company/tenant identifier.
 */
export const MODULE_CATALOG: readonly ModuleCatalogDefinition[] = [
  { code: 'core', name: 'Core Platform', description: 'Authentication, RBAC, plants, audit, notifications and platform services.', version: '1.0.0', isCore: true },
  { code: 'asset', name: 'Asset Management', description: 'Asset hierarchy, equipment registry, components, facilities and engineering BOM.', version: '1.0.0', isCore: false },
  { code: 'rwop', name: 'Repairs & Work Orders', description: 'Maintenance requests, repair work orders, execution, tools, materials and closure.', version: '1.0.0', isCore: false },
  { code: 'mrmp', name: 'Maintenance Reliability', description: 'Preventive, predictive and reliability-centered maintenance capabilities.', version: '1.0.0', isCore: false },
  { code: 'ims', name: 'Inventory Management', description: 'Spares, stores, stock movements, purchasing, reservations and reconciliation.', version: '1.0.0', isCore: false },
  { code: 'hrms', name: 'HR & Workforce', description: 'Employees, shifts, skills, training, trades and maintenance workforce planning.', version: '1.0.0', isCore: false },
  { code: 'mpmp', name: 'Production Management', description: 'Production, OEE, downtime, energy and manufacturing operations.', version: '1.0.0', isCore: false },
  { code: 'trac', name: 'Tools & Safety Control', description: 'Tool custody, calibration, LOTO, permits, inspections and safety controls.', version: '1.0.0', isCore: false },
  { code: 'iot', name: 'IoT & Condition Monitoring', description: 'Industrial sensors, telemetry, alarms and condition monitoring.', version: '1.0.0', isCore: false },
  { code: 'digital_twin', name: 'Digital Twin', description: '3D models, scenes, component mappings and visual maintenance intelligence.', version: '1.0.0', isCore: false },
  { code: 'reliability', name: 'Reliability Engineering', description: 'Failure analysis, RCM, Weibull, RBI, SIL and lifecycle forecasting.', version: '1.0.0', isCore: false },
  { code: 'documents', name: 'Engineering Documents', description: 'Industrial document intelligence, revisions, P&ID links and document control.', version: '1.0.0', isCore: false },
  { code: 'connectivity', name: 'Industrial Connectivity', description: 'Gateways and industrial protocol connectivity for on-premise/hybrid deployments.', version: '1.0.0', isCore: false },
  { code: 'reports', name: 'Enterprise Reports', description: 'Cross-module reports, PDF/print/XLSX exports and operational analytics.', version: '1.0.0', isCore: false },
  { code: 'ai', name: 'AI & Predictive Intelligence', description: 'AI-assisted analysis, recommendations and predictive intelligence.', version: '1.0.0', isCore: false },
  { code: 'sto', name: 'Shutdown & Turnaround', description: 'Shutdown, turnaround and outage planning/execution management.', version: '1.0.0', isCore: false },
] as const;

export type ModuleLicenseStatus = 'core' | 'unlicensed' | 'scheduled' | 'licensed' | 'expired';

export interface ModuleActivationConfig {
  enabled: boolean;
  enabledAt: string | null;
  enabledBy: string | null;
  disabledAt: string | null;
  disabledBy: string | null;
  reason: string | null;
}

export interface ModuleLicenseMetadata {
  licensedAt: string | null;
  licensedBySuperAdminId: string | null;
  revokedAt: string | null;
  revokedBySuperAdminId: string | null;
  reason: string | null;
  subscription: Record<string, unknown> | null;
}

export interface EffectiveModuleState {
  id: string;
  code: string;
  name: string;
  description: string | null;
  version: string;
  isCore: boolean;
  licenseStatus: ModuleLicenseStatus;
  licensed: boolean;
  enabled: boolean;
  effective: boolean;
  validFrom: string | null;
  validUntil: string | null;
  licenseKeyHash: string | null;
  activation: ModuleActivationConfig;
  licenseMetadata: ModuleLicenseMetadata;
}

const ACTIVATION_PREFIX = 'module_activation:';
const LICENSE_META_PREFIX = 'module_license_meta:';

function activationKey(code: string): string {
  return `${ACTIVATION_PREFIX}${normalizeCode(code)}`;
}

function licenseMetaKey(code: string): string {
  return `${LICENSE_META_PREFIX}${normalizeCode(code)}`;
}

function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function defaultActivation(isCore: boolean): ModuleActivationConfig {
  return {
    enabled: isCore,
    enabledAt: isCore ? new Date(0).toISOString() : null,
    enabledBy: null,
    disabledAt: null,
    disabledBy: null,
    reason: null,
  };
}

function defaultLicenseMetadata(): ModuleLicenseMetadata {
  return {
    licensedAt: null,
    licensedBySuperAdminId: null,
    revokedAt: null,
    revokedBySuperAdminId: null,
    reason: null,
    subscription: null,
  };
}

function hashLicenseKey(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return createHash('sha256').update(raw.trim()).digest('hex');
}

function deriveLicenseStatus(module: {
  isCore: boolean;
  isSystemLicensed: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
}, now = new Date()): ModuleLicenseStatus {
  if (module.isCore) return 'core';
  if (!module.isSystemLicensed) return 'unlicensed';
  if (module.validFrom && module.validFrom.getTime() > now.getTime()) return 'scheduled';
  if (module.validUntil && module.validUntil.getTime() < now.getTime()) return 'expired';
  return 'licensed';
}

export async function ensureModuleCatalog(): Promise<void> {
  for (const definition of MODULE_CATALOG) {
    await db.systemModule.upsert({
      where: { code: definition.code },
      create: {
        code: definition.code,
        name: definition.name,
        description: definition.description,
        version: definition.version,
        isCore: definition.isCore,
        isSystemLicensed: definition.isCore,
      },
      update: {
        name: definition.name,
        description: definition.description,
        version: definition.version,
        isCore: definition.isCore,
        ...(definition.isCore ? { isSystemLicensed: true } : {}),
      },
    });
  }
}

export async function getModuleStates(): Promise<EffectiveModuleState[]> {
  await ensureModuleCatalog();

  const modules = await db.systemModule.findMany({ orderBy: [{ isCore: 'desc' }, { name: 'asc' }] });
  const configKeys = modules.flatMap((module) => [activationKey(module.code), licenseMetaKey(module.code)]);
  const configs = configKeys.length > 0
    ? await db.systemConfig.findMany({ where: { key: { in: configKeys } } })
    : [];
  const configMap = new Map(configs.map((config) => [config.key, config.config]));

  return modules.map((module) => {
    const licenseStatus = deriveLicenseStatus(module);
    const activation = module.isCore
      ? defaultActivation(true)
      : parseJson<ModuleActivationConfig>(configMap.get(activationKey(module.code)), defaultActivation(false));
    const metadata = parseJson<ModuleLicenseMetadata>(configMap.get(licenseMetaKey(module.code)), defaultLicenseMetadata());
    const licensed = licenseStatus === 'core' || licenseStatus === 'licensed';
    const enabled = module.isCore || Boolean(activation.enabled);

    return {
      id: module.id,
      code: module.code,
      name: module.name,
      description: module.description,
      version: module.version,
      isCore: module.isCore,
      licenseStatus,
      licensed,
      enabled,
      effective: licensed && enabled,
      validFrom: module.validFrom?.toISOString() ?? null,
      validUntil: module.validUntil?.toISOString() ?? null,
      licenseKeyHash: module.licenseKey,
      activation,
      licenseMetadata: metadata,
    };
  });
}

export async function getModuleState(code: string): Promise<EffectiveModuleState | null> {
  const normalized = normalizeCode(code);
  const states = await getModuleStates();
  return states.find((state) => state.code === normalized) ?? null;
}

export async function grantModuleLicense(params: {
  session: SessionData;
  code: string;
  licenseKey?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  reason?: string | null;
  subscription?: Record<string, unknown> | null;
}): Promise<EffectiveModuleState> {
  await requireSuperAdmin(params.session);
  await ensureModuleCatalog();

  const code = normalizeCode(params.code);
  const existing = await db.systemModule.findUnique({ where: { code } });
  if (!existing) throw new ModuleLicensingError('MODULE_NOT_FOUND', `Unknown module '${code}'`, 404);
  if (existing.isCore) throw new ModuleLicensingError('CORE_LICENSE_IMMUTABLE', 'Core platform licensing is immutable', 409);
  if (params.validFrom && params.validUntil && params.validUntil <= params.validFrom) {
    throw new ModuleLicensingError('INVALID_LICENSE_WINDOW', 'validUntil must be later than validFrom', 400);
  }

  const now = new Date();
  const licenseHash = hashLicenseKey(params.licenseKey);
  const beforeState = await getModuleState(code);
  const metadata: ModuleLicenseMetadata = {
    licensedAt: now.toISOString(),
    licensedBySuperAdminId: params.session.userId,
    revokedAt: null,
    revokedBySuperAdminId: null,
    reason: params.reason?.trim() || null,
    subscription: params.subscription ?? null,
  };

  await db.$transaction(async (tx) => {
    await tx.systemModule.update({
      where: { id: existing.id },
      data: {
        isSystemLicensed: true,
        licenseKey: licenseHash,
        validFrom: params.validFrom ?? now,
        validUntil: params.validUntil ?? null,
      },
    });
    await tx.systemConfig.upsert({
      where: { key: licenseMetaKey(code) },
      create: { key: licenseMetaKey(code), config: JSON.stringify(metadata) },
      update: { config: JSON.stringify(metadata) },
    });
  });

  const afterState = await getModuleState(code);
  if (!afterState) throw new ModuleLicensingError('MODULE_NOT_FOUND', `Unknown module '${code}'`, 404);

  await logPrivilegedAction({
    userId: params.session.userId,
    action: 'module.license.grant',
    resourceType: 'ModuleLicense',
    resourceId: existing.id,
    beforeState: beforeState ? sanitizeStateForAudit(beforeState) : undefined,
    afterState: sanitizeStateForAudit(afterState),
    metadata: { moduleCode: code, reason: params.reason ?? null },
  });

  return afterState;
}

export async function revokeModuleLicense(params: {
  session: SessionData;
  code: string;
  reason: string;
}): Promise<EffectiveModuleState> {
  await requireSuperAdmin(params.session);
  await ensureModuleCatalog();

  const code = normalizeCode(params.code);
  const existing = await db.systemModule.findUnique({ where: { code } });
  if (!existing) throw new ModuleLicensingError('MODULE_NOT_FOUND', `Unknown module '${code}'`, 404);
  if (existing.isCore) throw new ModuleLicensingError('CORE_LICENSE_IMMUTABLE', 'Core platform licensing cannot be revoked', 409);
  if (!params.reason?.trim()) throw new ModuleLicensingError('REASON_REQUIRED', 'A revocation reason is required', 400);

  const now = new Date();
  const beforeState = await getModuleState(code);
  const previousMetadata = parseJson<ModuleLicenseMetadata>(
    (await db.systemConfig.findUnique({ where: { key: licenseMetaKey(code) } }))?.config,
    defaultLicenseMetadata(),
  );
  const metadata: ModuleLicenseMetadata = {
    ...previousMetadata,
    revokedAt: now.toISOString(),
    revokedBySuperAdminId: params.session.userId,
    reason: params.reason.trim(),
  };
  const activation: ModuleActivationConfig = {
    enabled: false,
    enabledAt: null,
    enabledBy: null,
    disabledAt: now.toISOString(),
    disabledBy: params.session.userId,
    reason: `License revoked: ${params.reason.trim()}`,
  };

  await db.$transaction(async (tx) => {
    await tx.systemModule.update({
      where: { id: existing.id },
      data: {
        isSystemLicensed: false,
        licenseKey: null,
        validUntil: now,
      },
    });
    await tx.systemConfig.upsert({
      where: { key: licenseMetaKey(code) },
      create: { key: licenseMetaKey(code), config: JSON.stringify(metadata) },
      update: { config: JSON.stringify(metadata) },
    });
    await tx.systemConfig.upsert({
      where: { key: activationKey(code) },
      create: { key: activationKey(code), config: JSON.stringify(activation) },
      update: { config: JSON.stringify(activation) },
    });
  });

  const afterState = await getModuleState(code);
  if (!afterState) throw new ModuleLicensingError('MODULE_NOT_FOUND', `Unknown module '${code}'`, 404);

  await logPrivilegedAction({
    userId: params.session.userId,
    action: 'module.license.revoke',
    resourceType: 'ModuleLicense',
    resourceId: existing.id,
    beforeState: beforeState ? sanitizeStateForAudit(beforeState) : undefined,
    afterState: sanitizeStateForAudit(afterState),
    metadata: { moduleCode: code, reason: params.reason.trim() },
  });

  return afterState;
}

export async function setModuleActivation(params: {
  session: SessionData;
  code: string;
  enabled: boolean;
  reason?: string | null;
}): Promise<EffectiveModuleState> {
  await ensureModuleCatalog();

  const superAdmin = await isSuperAdmin(params.session);
  if (!superAdmin && !isAdmin(params.session)) {
    throw new ModuleLicensingError('SYSTEM_ADMIN_REQUIRED', 'System Admin authorization is required to change module activation', 403);
  }

  const code = normalizeCode(params.code);
  const current = await getModuleState(code);
  if (!current) throw new ModuleLicensingError('MODULE_NOT_FOUND', `Unknown module '${code}'`, 404);
  if (current.isCore) throw new ModuleLicensingError('CORE_ACTIVATION_IMMUTABLE', 'Core platform activation is immutable', 409);
  if (params.enabled && !current.licensed) {
    throw new ModuleLicensingError('MODULE_NOT_LICENSED', `Module '${code}' does not have a currently valid Super Admin license`, 409);
  }

  const now = new Date();
  const activation: ModuleActivationConfig = params.enabled
    ? {
        enabled: true,
        enabledAt: now.toISOString(),
        enabledBy: params.session.userId,
        disabledAt: null,
        disabledBy: null,
        reason: params.reason?.trim() || null,
      }
    : {
        enabled: false,
        enabledAt: current.activation.enabledAt,
        enabledBy: current.activation.enabledBy,
        disabledAt: now.toISOString(),
        disabledBy: params.session.userId,
        reason: params.reason?.trim() || null,
      };

  await db.systemConfig.upsert({
    where: { key: activationKey(code) },
    create: { key: activationKey(code), config: JSON.stringify(activation) },
    update: { config: JSON.stringify(activation) },
  });

  const afterState = await getModuleState(code);
  if (!afterState) throw new ModuleLicensingError('MODULE_NOT_FOUND', `Unknown module '${code}'`, 404);

  await createAuditLog(params.session.userId, 'ModuleActivation', params.enabled ? 'enable' : 'disable', current.id, {
    oldValues: sanitizeStateForAudit(current),
    newValues: sanitizeStateForAudit(afterState),
  });

  return afterState;
}

export async function requireEnabledLicensedModule(code: string): Promise<EffectiveModuleState> {
  const state = await getModuleState(code);
  if (!state) throw new ModuleLicensingError('MODULE_NOT_FOUND', `Unknown module '${normalizeCode(code)}'`, 404);
  if (!state.licensed) {
    throw new ModuleLicensingError(
      state.licenseStatus === 'expired' ? 'MODULE_LICENSE_EXPIRED' : 'MODULE_NOT_LICENSED',
      `Module '${state.code}' is not currently licensed`,
      403,
    );
  }
  if (!state.enabled) {
    throw new ModuleLicensingError('MODULE_DISABLED', `Module '${state.code}' is licensed but disabled by System Admin`, 403);
  }
  return state;
}

export async function isModuleEffective(code: string): Promise<boolean> {
  const state = await getModuleState(code);
  return Boolean(state?.effective);
}

function sanitizeStateForAudit(state: EffectiveModuleState): Record<string, unknown> {
  return {
    moduleId: state.id,
    code: state.code,
    licenseStatus: state.licenseStatus,
    licensed: state.licensed,
    enabled: state.enabled,
    effective: state.effective,
    validFrom: state.validFrom,
    validUntil: state.validUntil,
    licenseKeyPresent: Boolean(state.licenseKeyHash),
  };
}

export class ModuleLicensingError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'ModuleLicensingError';
  }
}
