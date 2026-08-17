// ============================================================================
// Plant Scope — Type Contract & Fail-Closed Behavior Tests
// ============================================================================
//
// Tests the plant-scope module's exported types and pure functions.
// Since getPlantScope requires a NextRequest and DB access, we test
// getPlantFilterWhere, canAccessPlant, and applyPlantScope (pure functions) directly,
// and validate the PlantScopeResult type contract.
//
// We mock @/lib/db and @/lib/auth to prevent Prisma client initialization.
//
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// Mock DB and auth before importing plant-scope
vi.mock('@/lib/db', () => ({
  db: {
    userPlant: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({
  isAdmin: vi.fn((session: { roles: string[] }) => session.roles.includes('admin')),
  SessionData: {},
}));

import type { PlantScopeResult } from '../plant-scope';
import { getPlantFilterWhere, applyPlantScope, getPlantScope, canAccessPlant } from '../plant-scope';

// We need to import NextRequest for getPlantScope tests
vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    headers: Map<string, string>;
    constructor(init?: { headers?: Record<string, string> }) {
      this.headers = new Map(Object.entries(init?.headers ?? {}));
    }
    get(header: string) {
      return this.headers.get(header) ?? null;
    }
  },
}));

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// Helper: create a valid PlantScopeResult (with all required fields)
function makeScope(overrides: Partial<PlantScopeResult>): PlantScopeResult {
  return {
    plantId: null,
    accessiblePlantIds: [],
    isScoped: false,
    isSystemWide: false,
    accessLevel: null,
    ...overrides,
  };
}

// ============================================================================
// Test 1: PlantScopeResult type contract
// ============================================================================
describe('PlantScopeResult type contract', () => {
  it('should include denyAccess as optional boolean', () => {
    const result: PlantScopeResult = makeScope({
      isScoped: false,
    });
    expect(result.denyAccess).toBeUndefined();
  });

  it('should support denyAccess: true for access denied', () => {
    const result: PlantScopeResult = makeScope({
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    });
    expect(result.denyAccess).toBe(true);
    expect(result.accessLevel).toBe('none');
    expect(result.isScoped).toBe(true);
    expect(result.plantId).toBeNull();
  });

  it('should support full access result', () => {
    const result: PlantScopeResult = makeScope({
      plantId: 'plant-001',
      accessLevel: 'write',
      isScoped: true,
      accessiblePlantIds: ['plant-001'],
    });
    expect(result.plantId).toBe('plant-001');
    expect(result.accessLevel).toBe('write');
    expect(result.isScoped).toBe(true);
  });

  it('should support unscoped (bypass) result', () => {
    const result: PlantScopeResult = makeScope({
      isSystemWide: true,
      isScoped: false,
    });
    expect(result.isScoped).toBe(false);
    expect(result.plantId).toBeNull();
    expect(result.isSystemWide).toBe(true);
  });

  it('should support no-header result with accessible plant IDs', () => {
    const result: PlantScopeResult = makeScope({
      isScoped: false,
      isSystemWide: false,
      accessiblePlantIds: ['plant-a', 'plant-b'],
    });
    expect(result.isScoped).toBe(false);
    expect(result.accessiblePlantIds).toEqual(['plant-a', 'plant-b']);
  });
});

// ============================================================================
// Test 2: Fail-closed behavior is documented
// ============================================================================
describe('Fail-closed behavior (documented)', () => {
  it('should deny access when denyAccess is true', () => {
    const deniedScope: PlantScopeResult = makeScope({
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    });
    const shouldDeny = deniedScope.denyAccess === true;
    expect(shouldDeny).toBe(true);
  });

  it('should NOT silently fall back to unscoped view when plant access denied', () => {
    const deniedScope: PlantScopeResult = makeScope({
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    });
    expect(deniedScope.isScoped).toBe(true);
    expect(deniedScope.denyAccess).toBe(true);
    expect(deniedScope.plantId).toBeNull();
  });
});

// ============================================================================
// Test 3: getPlantFilterWhere pure function
// ============================================================================
describe('getPlantFilterWhere', () => {
  it('should return empty object when system-wide', () => {
    const scope: PlantScopeResult = makeScope({ isSystemWide: true });
    const filter = getPlantFilterWhere(scope);
    expect(filter).toEqual({});
  });

  it('should return IN filter when not scoped but has accessible plants', () => {
    const scope: PlantScopeResult = makeScope({
      isScoped: false,
      isSystemWide: false,
      accessiblePlantIds: ['plant-a', 'plant-b'],
    });
    const filter = getPlantFilterWhere(scope);
    expect(filter).toEqual({ plantId: { in: ['plant-a', 'plant-b'] } });
  });

  it('should return sentinel when no accessible plants', () => {
    const scope: PlantScopeResult = makeScope({
      isScoped: false,
      isSystemWide: false,
      accessiblePlantIds: [],
    });
    const filter = getPlantFilterWhere(scope);
    expect(filter).toEqual({ plantId: '__ACCESS_DENIED__' });
  });

  it('should return plantId filter when scoped with plantId', () => {
    const scope: PlantScopeResult = makeScope({
      plantId: 'plant-abc',
      accessLevel: 'write',
      isScoped: true,
      accessiblePlantIds: ['plant-abc', 'plant-xyz'],
    });
    const filter = getPlantFilterWhere(scope);
    expect(filter).toEqual({ plantId: 'plant-abc' });
  });

  it('should return sentinel filter when denyAccess is true (fail-closed)', () => {
    const scope: PlantScopeResult = makeScope({
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    });
    const filter = getPlantFilterWhere(scope);
    expect(filter).toEqual({ plantId: '__ACCESS_DENIED__' });
  });

  it('should support custom plantIdField', () => {
    const scope: PlantScopeResult = makeScope({
      plantId: 'plant-xyz',
      accessLevel: 'admin',
      isScoped: true,
    });
    const filter = getPlantFilterWhere(scope, 'locationPlantId');
    expect(filter).toEqual({ locationPlantId: 'plant-xyz' });
  });

  it('should use custom plantIdField with denyAccess sentinel', () => {
    const scope: PlantScopeResult = makeScope({
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    });
    const filter = getPlantFilterWhere(scope, 'facilityPlantId');
    expect(filter).toEqual({ facilityPlantId: '__ACCESS_DENIED__' });
  });
});

// ============================================================================
// Test 4: canAccessPlant pure function
// ============================================================================
describe('canAccessPlant', () => {
  it('should return true for system-wide users', () => {
    const scope = makeScope({ isSystemWide: true });
    expect(canAccessPlant(scope, 'any-plant')).toBe(true);
  });

  it('should return true when entity has no plant', () => {
    const scope = makeScope({ accessiblePlantIds: ['plant-a'] });
    expect(canAccessPlant(scope, null)).toBe(true);
    expect(canAccessPlant(scope, undefined)).toBe(true);
  });

  it('should return false when denyAccess is true', () => {
    const scope = makeScope({ denyAccess: true });
    expect(canAccessPlant(scope, 'plant-a')).toBe(false);
  });

  it('should return true when plant is in accessible set', () => {
    const scope = makeScope({ accessiblePlantIds: ['plant-a', 'plant-b'] });
    expect(canAccessPlant(scope, 'plant-a')).toBe(true);
    expect(canAccessPlant(scope, 'plant-b')).toBe(true);
  });

  it('should return false when plant is NOT in accessible set', () => {
    const scope = makeScope({ accessiblePlantIds: ['plant-a'] });
    expect(canAccessPlant(scope, 'plant-b')).toBe(false);
  });

  it('should return true when explicitly scoped plant matches', () => {
    const scope = makeScope({
      plantId: 'plant-a',
      isScoped: true,
      accessiblePlantIds: ['plant-a', 'plant-b'],
    });
    expect(canAccessPlant(scope, 'plant-a')).toBe(true);
  });

  it('should return false when explicitly scoped plant does NOT match', () => {
    const scope = makeScope({
      plantId: 'plant-a',
      isScoped: true,
      accessiblePlantIds: ['plant-a', 'plant-b'],
    });
    expect(canAccessPlant(scope, 'plant-c')).toBe(false);
  });
});

// ============================================================================
// Test 5: applyPlantScope pure function
// ============================================================================
describe('applyPlantScope', () => {
  it('should return original where when system-wide', () => {
    const where = { status: 'active', type: 'breakdown' };
    const scope = makeScope({ isSystemWide: true });
    const result = applyPlantScope(where, scope);
    expect(result).toEqual(where);
  });

  it('should apply IN filter when not scoped but has accessible plants', () => {
    const where = { status: 'active' };
    const scope = makeScope({
      accessiblePlantIds: ['plant-a', 'plant-b'],
    });
    const result = applyPlantScope(where, scope);
    expect(result).toEqual({ status: 'active', plantId: { in: ['plant-a', 'plant-b'] } });
  });

  it('should merge plantId into existing where clause', () => {
    const where = { status: 'active' };
    const scope = makeScope({
      plantId: 'plant-001',
      accessLevel: 'write',
      isScoped: true,
      accessiblePlantIds: ['plant-001'],
    });
    const result = applyPlantScope(where, scope);
    expect(result).toEqual({ status: 'active', plantId: 'plant-001' });
  });

  it('should NOT mutate the original where object', () => {
    const where = { status: 'active' };
    const scope = makeScope({
      plantId: 'plant-001',
      isScoped: true,
      accessiblePlantIds: ['plant-001'],
    });
    const result = applyPlantScope(where, scope);
    expect(where).toEqual({ status: 'active' });
    expect(Object.keys(where)).toHaveLength(1);
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('should apply sentinel filter on denyAccess (fail-closed)', () => {
    const where = { status: 'pending' };
    const scope = makeScope({
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    });
    const result = applyPlantScope(where, scope);
    expect(result).toEqual({ status: 'pending', plantId: '__ACCESS_DENIED__' });
  });

  it('should use custom plantIdField in applyPlantScope', () => {
    const where = { isActive: true };
    const scope = makeScope({
      plantId: 'plant-abc',
      isScoped: true,
      accessiblePlantIds: ['plant-abc'],
    });
    const result = applyPlantScope(where, scope, 'targetPlantId');
    expect(result).toEqual({ isActive: true, targetPlantId: 'plant-abc' });
  });
});

// ============================================================================
// Test 6: getPlantScope integration (with mocked DB)
// ============================================================================
describe('getPlantScope integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should bypass scoping for admin users', async () => {
    const request = new NextRequest({}) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const session = { userId: 'admin-1', roles: ['admin'], permissions: [] } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await getPlantScope(request, session);
    expect(result.isScoped).toBe(false);
    expect(result.isSystemWide).toBe(true);
    expect(result.plantId).toBeNull();
  });

  it('should bypass scoping for plant_manager users', async () => {
    const request = new NextRequest({}) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const session = { userId: 'pm-1', roles: ['plant_manager'], permissions: [] } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await getPlantScope(request, session);
    expect(result.isScoped).toBe(false);
    expect(result.isSystemWide).toBe(true);
  });

  it('should return accessiblePlantIds when no X-Plant-ID header', async () => {
    const request = new NextRequest({}) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const session = { userId: 'user-1', roles: ['planner'], permissions: [] } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    (db.userPlant.findMany as Mock).mockResolvedValue([
      { plantId: 'plant-a', accessLevel: 'write' },
      { plantId: 'plant-b', accessLevel: 'read' },
    ]);

    const result = await getPlantScope(request, session);
    expect(result.isScoped).toBe(false);
    expect(result.isSystemWide).toBe(false);
    expect(result.accessiblePlantIds).toEqual(['plant-a', 'plant-b']);
  });

  it('should return denyAccess when user has no access to requested plant', async () => {
    const request = new NextRequest({ headers: { 'X-Plant-ID': 'plant-999' } }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const session = { userId: 'user-1', roles: ['planner'], permissions: [] } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    (db.userPlant.findMany as Mock).mockResolvedValue([
      { plantId: 'plant-a', accessLevel: 'write' },
    ]);

    const result = await getPlantScope(request, session);
    expect(result.isScoped).toBe(true);
    expect(result.denyAccess).toBe(true);
    expect(result.accessLevel).toBe('none');
  });

  it('should return scoped access when user has access to plant', async () => {
    const request = new NextRequest({ headers: { 'X-Plant-ID': 'plant-001' } }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const session = { userId: 'user-1', roles: ['planner'], permissions: [] } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    (db.userPlant.findMany as Mock).mockResolvedValue([
      { plantId: 'plant-001', accessLevel: 'write' },
      { plantId: 'plant-002', accessLevel: 'read' },
    ]);

    const result = await getPlantScope(request, session);
    expect(result.isScoped).toBe(true);
    expect(result.plantId).toBe('plant-001');
    expect(result.accessLevel).toBe('write');
    expect(result.accessiblePlantIds).toEqual(['plant-001', 'plant-002']);
    expect(result.denyAccess).toBeUndefined();
  });
});

// ============================================================================
// Test 7: Security contract documentation
// ============================================================================
describe('Security contract (documented)', () => {
  it('should document that denyAccess check should happen before query', () => {
    const scope = makeScope({
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    });

    // Step 1: Check denyAccess first
    const shouldReturn403 = scope.denyAccess === true;
    expect(shouldReturn403).toBe(true);

    // Step 2: If caller ignores denyAccess, the filter still protects:
    const safetyNetFilter = getPlantFilterWhere(scope);
    expect(safetyNetFilter.plantId).toBe('__ACCESS_DENIED__');
  });

  it('should document admin/plant_manager bypass behavior', () => {
    const adminScope = makeScope({ isSystemWide: true });

    expect(adminScope.isScoped).toBe(false);
    expect(adminScope.isSystemWide).toBe(true);
    const filter = getPlantFilterWhere(adminScope);
    expect(filter).toEqual({});
  });

  it('should document canAccessPlant as preferred guard for direct-ID routes', () => {
    const scope = makeScope({
      accessiblePlantIds: ['plant-a'],
      isSystemWide: false,
    });

    // Entity in Plant A — allowed
    expect(canAccessPlant(scope, 'plant-a')).toBe(true);

    // Entity in Plant B — blocked
    expect(canAccessPlant(scope, 'plant-b')).toBe(false);

    // Entity with no plant — allowed (not plant-scoped)
    expect(canAccessPlant(scope, null)).toBe(true);
  });
});

// ============================================================================
// Test 8: Plant scope list/aggregate filtering
// ============================================================================
describe('Plant scope list/aggregate filtering', () => {
  // 1. isSystemWide=true → where clause unchanged
  it('should return where clause unchanged when isSystemWide=true (no filter)', () => {
    const where = { status: 'open', priority: 'high' };
    const scope = makeScope({ isSystemWide: true });
    const result = applyPlantScope(where, scope);
    expect(result).toBe(where); // same reference — returned as-is
    expect(result).toEqual({ status: 'open', priority: 'high' });
  });

  // 2. isScoped=false with accessiblePlantIds → IN filter
  it('should add IN filter when isScoped=false with accessiblePlantIds', () => {
    const where = { status: 'active' };
    const scope = makeScope({
      isScoped: false,
      isSystemWide: false,
      accessiblePlantIds: ['plant-a', 'plant-b'],
    });
    const result = applyPlantScope(where, scope);
    expect(result).toEqual({
      status: 'active',
      plantId: { in: ['plant-a', 'plant-b'] },
    });
  });

  // 3. denyAccess=true → sentinel filter
  it('should add ACCESS_DENIED sentinel when denyAccess=true', () => {
    const where = { type: 'inspection' };
    const scope = makeScope({
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    });
    const result = applyPlantScope(where, scope);
    expect(result).toEqual({
      type: 'inspection',
      plantId: '__ACCESS_DENIED__',
    });
  });

  // 4. isScoped=true with plantId → exact match filter
  it('should add exact plantId filter when isScoped=true', () => {
    const where = { category: 'pm' };
    const scope = makeScope({
      plantId: 'plant-a',
      isScoped: true,
      accessiblePlantIds: ['plant-a', 'plant-b'],
    });
    const result = applyPlantScope(where, scope);
    expect(result).toEqual({
      category: 'pm',
      plantId: 'plant-a',
    });
  });

  // 5. empty accessiblePlantIds and not systemWide → sentinel (zero records)
  it('should add ACCESS_DENIED sentinel when accessiblePlantIds is empty and not systemWide', () => {
    const where = { status: 'completed' };
    const scope = makeScope({
      isScoped: false,
      isSystemWide: false,
      accessiblePlantIds: [],
    });
    const result = applyPlantScope(where, scope);
    expect(result).toEqual({
      status: 'completed',
      plantId: '__ACCESS_DENIED__',
    });
  });

  // 6. getPlantFilterWhere with nested relation field
  it('should return correct filter with nested relation field name', () => {
    const scopedFilter = makeScope({
      plantId: 'plant-1',
      isScoped: true,
      accessiblePlantIds: ['plant-1', 'plant-2'],
    });
    const result = getPlantFilterWhere(scopedFilter, 'workOrder.plantId');
    expect(result).toEqual({ 'workOrder.plantId': 'plant-1' });

    const listFilter = makeScope({
      isScoped: false,
      isSystemWide: false,
      accessiblePlantIds: ['plant-1', 'plant-2'],
    });
    const listResult = getPlantFilterWhere(listFilter, 'workOrder.plantId');
    expect(listResult).toEqual({
      'workOrder.plantId': { in: ['plant-1', 'plant-2'] },
    });

    const denyFilter = makeScope({
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    });
    const denyResult = getPlantFilterWhere(denyFilter, 'workOrder.plantId');
    expect(denyResult).toEqual({ 'workOrder.plantId': '__ACCESS_DENIED__' });
  });

  // 7. canAccessPlant returns false when denyAccess=true for any non-null entityPlantId
  it('should return false when denyAccess=true for any non-null entityPlantId', () => {
    const scope = makeScope({
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
      accessiblePlantIds: ['plant-a', 'plant-b'],
    });

    // Even a matching plant ID should be denied
    expect(canAccessPlant(scope, 'plant-a')).toBe(false);
    // Non-matching plant ID should also be denied
    expect(canAccessPlant(scope, 'plant-z')).toBe(false);
    // Any arbitrary plant ID is denied
    expect(canAccessPlant(scope, 'plant-b')).toBe(false);
    // Note: null/undefined entityPlantId returns true due to the
    // !entityPlantId guard that fires before denyAccess check.
    // This is by design — entities without a plant are not plant-scoped.
    expect(canAccessPlant(scope, null)).toBe(true);
    expect(canAccessPlant(scope, undefined)).toBe(true);
  });
});
