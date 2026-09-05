import { test, expect } from '@playwright/test';

const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const PASSWORD = 'TestPass123!';

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: text };
  }
}

async function login(username: string): Promise<string> {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD }),
  });
  const json = await readJson(response);
  expect(response.status, JSON.stringify(json)).toBe(200);
  expect(json.data?.token).toBeTruthy();
  return json.data.token as string;
}

async function call(token: string, method: string, path: string, body?: unknown) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await readJson(response) };
}

function findModule(data: any, code: string) {
  return (data.data as any[]).find((module) => module.code === code);
}

test('installation module licensing authority and effective-state contract', async () => {
  const superToken = await login('uat_super_admin');
  const systemToken = await login('uat_system_admin');

  await test.step('L1: System Admin sees catalog but has no license authority', async () => {
    const { status, data } = await call(systemToken, 'GET', '/api/admin/modules');
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.authority.isSystemAdmin).toBe(true);
    expect(data.authority.isSuperAdmin).toBe(false);
    expect(data.authority.canGrantOrRevokeLicense).toBe(false);
    expect(data.authority.canEnableOrDisable).toBe(true);

    const rwop = findModule(data, 'rwop');
    expect(rwop).toBeTruthy();
    expect(rwop.licensed).toBe(false);
    expect(rwop.enabled).toBe(false);
    expect(rwop.effective).toBe(false);
  });

  await test.step('L2: System Admin cannot grant a license or enable an unlicensed module', async () => {
    const grant = await call(systemToken, 'PUT', '/api/admin/modules/rwop/license', {
      licenseKey: 'SYSTEM-ADMIN-MUST-NOT-GRANT',
    });
    expect(grant.status).toBe(403);
    expect(grant.data.code).toBe('SUPER_ADMIN_REQUIRED');

    const activation = await call(systemToken, 'PATCH', '/api/admin/modules/rwop/activation', { enabled: true });
    expect(activation.status).toBe(409);
    expect(activation.data.code).toBe('MODULE_NOT_LICENSED');
  });

  await test.step('L3: Super Admin grants a valid license; key is hashed; activation remains off', async () => {
    const rawKey = 'RWOP-UAT-LICENSE-SECRET';
    const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { status, data } = await call(superToken, 'PUT', '/api/admin/modules/rwop/license', {
      licenseKey: rawKey,
      validUntil,
      reason: 'UAT grant',
      subscription: { plan: 'enterprise', reference: 'UAT-001' },
    });

    expect(status).toBe(200);
    expect(data.data.licenseStatus).toBe('licensed');
    expect(data.data.licensed).toBe(true);
    expect(data.data.enabled).toBe(false);
    expect(data.data.effective).toBe(false);
    expect(data.data.licenseKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.data.licenseKeyHash).not.toBe(rawKey);
    expect(data.data.licenseMetadata.licensedBySuperAdminId).toBeTruthy();
  });

  await test.step('L4: System Admin activates a valid license and module becomes effective', async () => {
    const { status, data } = await call(systemToken, 'PATCH', '/api/admin/modules/rwop/activation', {
      enabled: true,
      reason: 'Enable licensed Repairs module',
    });
    expect(status).toBe(200);
    expect(data.data.licensed).toBe(true);
    expect(data.data.enabled).toBe(true);
    expect(data.data.effective).toBe(true);
    expect(data.data.activation.enabledBy).toBeTruthy();
  });

  await test.step('L5: An expired license is ineffective even when activation was previously on', async () => {
    const validFrom = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const validUntil = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const expired = await call(superToken, 'PUT', '/api/admin/modules/rwop/license', {
      licenseKey: 'RWOP-UAT-EXPIRED',
      validFrom,
      validUntil,
      reason: 'UAT expiry check',
    });
    expect(expired.status).toBe(200);
    expect(expired.data.data.licenseStatus).toBe('expired');
    expect(expired.data.data.licensed).toBe(false);
    expect(expired.data.data.enabled).toBe(true);
    expect(expired.data.data.effective).toBe(false);

    const enable = await call(systemToken, 'PATCH', '/api/admin/modules/rwop/activation', { enabled: true });
    expect(enable.status).toBe(409);
    expect(enable.data.code).toBe('MODULE_NOT_LICENSED');
  });

  await test.step('L6: Super Admin can re-license; System Admin still cannot revoke', async () => {
    const regrant = await call(superToken, 'PUT', '/api/admin/modules/rwop/license', {
      licenseKey: 'RWOP-UAT-REGRANT',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      reason: 'UAT regrant',
    });
    expect(regrant.status).toBe(200);
    expect(regrant.data.data.licensed).toBe(true);

    const systemRevoke = await call(systemToken, 'DELETE', '/api/admin/modules/rwop/license', {
      reason: 'System Admin must not revoke',
    });
    expect(systemRevoke.status).toBe(403);
    expect(systemRevoke.data.code).toBe('SUPER_ADMIN_REQUIRED');
  });

  await test.step('L7: Super Admin revocation requires a reason and forces activation off', async () => {
    const noReason = await call(superToken, 'DELETE', '/api/admin/modules/rwop/license', {});
    expect(noReason.status).toBe(400);
    expect(noReason.data.code).toBe('REASON_REQUIRED');

    const revoke = await call(superToken, 'DELETE', '/api/admin/modules/rwop/license', {
      reason: 'UAT contract revocation',
    });
    expect(revoke.status).toBe(200);
    expect(revoke.data.data.licenseStatus).toBe('unlicensed');
    expect(revoke.data.data.licensed).toBe(false);
    expect(revoke.data.data.enabled).toBe(false);
    expect(revoke.data.data.effective).toBe(false);
    expect(revoke.data.data.licenseKeyHash).toBeNull();
    expect(revoke.data.data.licenseMetadata.revokedBySuperAdminId).toBeTruthy();

    const enableAfterRevoke = await call(systemToken, 'PATCH', '/api/admin/modules/rwop/activation', { enabled: true });
    expect(enableAfterRevoke.status).toBe(409);
    expect(enableAfterRevoke.data.code).toBe('MODULE_NOT_LICENSED');
  });

  await test.step('L8: Core platform cannot be revoked or disabled', async () => {
    const revokeCore = await call(superToken, 'DELETE', '/api/admin/modules/core/license', {
      reason: 'Must be rejected',
    });
    expect(revokeCore.status).toBe(409);
    expect(revokeCore.data.code).toBe('CORE_LICENSE_IMMUTABLE');

    const disableCore = await call(systemToken, 'PATCH', '/api/admin/modules/core/activation', { enabled: false });
    expect(disableCore.status).toBe(409);
    expect(disableCore.data.code).toBe('CORE_ACTIVATION_IMMUTABLE');
  });
});
