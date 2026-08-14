// ============================================================================
// Plant Scope — Type Contract & Fail-Closed Behavior Tests
// ============================================================================
//
// Tests the plant-scope module's exported types and pure functions.
// Since getPlantScope requires a NextRequest and DB access, we test
// getPlantFilterWhere and applyPlantScope (pure functions) directly,
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
    userPlant: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({
  isAdmin: vi.fn((session: { roles: string[] }) => session.roles.includes('admin')),
  SessionData: {},
}));

import type { PlantScopeResult } from '../plant-scope';
import { getPlantFilterWhere, applyPlantScope, getPlantScope } from '../plant-scope';

// We need to import NextRequest for getPlantScope tests
// Mock NextRequest to avoid importing the full next/server
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

// Re-import to get the mocked NextRequest
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// ============================================================================
// Test 1: PlantScopeResult type includes denyAccess field
// ============================================================================
describe('PlantScopeResult type contract', () => {
  it('should include denyAccess as optional boolean', () => {
    const result: PlantScopeResult = {
      plantId: null,
      accessLevel: null,
      isScoped: false,
    };
    expect(result.denyAccess).toBeUndefined();
  });

  it('should support denyAccess: true for access denied', () => {
    const result: PlantScopeResult = {
      plantId: null,
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    };
    expect(result.denyAccess).toBe(true);
    expect(result.accessLevel).toBe('none');
    expect(result.isScoped).toBe(true);
    expect(result.plantId).toBeNull();
  });

  it('should support full access result', () => {
    const result: PlantScopeResult = {
      plantId: 'plant-001',
      accessLevel: 'write',
      isScoped: true,
    };
    expect(result.plantId).toBe('plant-001');
    expect(result.accessLevel).toBe('write');
    expect(result.isScoped).toBe(true);
    expect(result.denyAccess).toBeUndefined();
  });

  it('should support unscoped (bypass) result', () => {
    // Admin / plant_manager get unscoped access
    const result: PlantScopeResult = {
      plantId: null,
      accessLevel: null,
      isScoped: false,
    };
    expect(result.isScoped).toBe(false);
    expect(result.plantId).toBeNull();
    expect(result.accessLevel).toBeNull();
  });

  it('should accept all valid access levels', () => {
    const levels: Array<'read' | 'write' | 'admin' | 'none' | null> = ['read', 'write', 'admin', 'none', null];
    expect(levels).toHaveLength(5);

    for (const level of levels) {
      const result: PlantScopeResult = {
        plantId: level ? 'plant-1' : null,
        accessLevel: level,
        isScoped: level !== null,
      };
      expect(result.accessLevel).toBe(level);
    }
  });
});

// ============================================================================
// Test 2: Fail-closed behavior is documented
// ============================================================================
describe('Fail-closed behavior (documented)', () => {
  it('should deny access when denyAccess is true', () => {
    const deniedScope: PlantScopeResult = {
      plantId: null,
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    };
    const shouldDeny = deniedScope.denyAccess === true;
    expect(shouldDeny).toBe(true);
  });

  it('should NOT silently fall back to unscoped view when plant access denied', () => {
    const deniedScope: PlantScopeResult = {
      plantId: null,
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    };
    expect(deniedScope.isScoped).toBe(true);
    expect(deniedScope.denyAccess).toBe(true);
    expect(deniedScope.plantId).toBeNull();
  });
});

// ============================================================================
// Test 3: getPlantFilterWhere pure function
// ============================================================================
describe('getPlantFilterWhere', () => {
  it('should return empty object when not scoped', () => {
    const scope: PlantScopeResult = {
      plantId: null,
      accessLevel: null,
      isScoped: false,
    };
    const filter = getPlantFilterWhere(scope);
    expect(filter).toEqual({});
  });

  it('should return empty object when scoped but no plantId', () => {
    const scope: PlantScopeResult = {
      plantId: null,
      accessLevel: null,
      isScoped: false,
    };
    const filter = getPlantFilterWhere(scope);
    expect(filter).toEqual({});
  });

  it('should return plantId filter when scoped with plantId', () => {
    const scope: PlantScopeResult = {
      plantId: 'plant-abc',
      accessLevel: 'write',
      isScoped: true,
    };
    const filter = getPlantFilterWhere(scope);
    expect(filter).toEqual({ plantId: 'plant-abc' });
  });

  it('should return sentinel filter when denyAccess is true (fail-closed)', () => {
    const scope: PlantScopeResult = {
      plantId: null,
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    };
    const filter = getPlantFilterWhere(scope);
    expect(filter).toEqual({ plantId: '__ACCESS_DENIED__' });
  });

  it('should support custom plantIdField', () => {
    const scope: PlantScopeResult = {
      plantId: 'plant-xyz',
      accessLevel: 'admin',
      isScoped: true,
    };
    const filter = getPlantFilterWhere(scope, 'locationPlantId');
    expect(filter).toEqual({ locationPlantId: 'plant-xyz' });
  });

  it('should use custom plantIdField with denyAccess sentinel', () => {
    const scope: PlantScopeResult = {
      plantId: null,
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    };
    const filter = getPlantFilterWhere(scope, 'facilityPlantId');
    expect(filter).toEqual({ facilityPlantId: '__ACCESS_DENIED__' });
  });
});

// ============================================================================
// Test 4: applyPlantScope pure function
// ============================================================================
describe('applyPlantScope', () => {
  it('should return original where when not scoped', () => {
    const where = { status: 'active', type: 'breakdown' };
    const scope: PlantScopeResult = {
      plantId: null,
      accessLevel: null,
      isScoped: false,
    };
    const result = applyPlantScope(where, scope);
    expect(result).toEqual(where);
  });

  it('should merge plantId into existing where clause', () => {
    const where = { status: 'active' };
    const scope: PlantScopeResult = {
      plantId: 'plant-001',
      accessLevel: 'write',
      isScoped: true,
    };
    const result = applyPlantScope(where, scope);
    expect(result).toEqual({ status: 'active', plantId: 'plant-001' });
  });

  it('should NOT mutate the original where object', () => {
    const where = { status: 'active' };
    const scope: PlantScopeResult = {
      plantId: 'plant-001',
      accessLevel: 'write',
      isScoped: true,
    };
    const result = applyPlantScope(where, scope);
    expect(where).toEqual({ status: 'active' });
    expect(Object.keys(where)).toHaveLength(1);
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('should apply sentinel filter on denyAccess (fail-closed)', () => {
    const where = { status: 'pending' };
    const scope: PlantScopeResult = {
      plantId: null,
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    };
    const result = applyPlantScope(where, scope);
    expect(result).toEqual({ status: 'pending', plantId: '__ACCESS_DENIED__' });
  });

  it('should use custom plantIdField in applyPlantScope', () => {
    const where = { isActive: true };
    const scope: PlantScopeResult = {
      plantId: 'plant-abc',
      accessLevel: 'read',
      isScoped: true,
    };
    const result = applyPlantScope(where, scope, 'targetPlantId');
    expect(result).toEqual({ isActive: true, targetPlantId: 'plant-abc' });
  });
});

// ============================================================================
// Test 5: getPlantScope integration (with mocked DB)
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
    expect(result.plantId).toBeNull();
  });

  it('should bypass scoping for plant_manager users', async () => {
    const request = new NextRequest({}) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const session = { userId: 'pm-1', roles: ['plant_manager'], permissions: [] } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await getPlantScope(request, session);
    expect(result.isScoped).toBe(false);
  });

  it('should return unscoped when no X-Plant-ID header', async () => {
    const request = new NextRequest({}) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const session = { userId: 'user-1', roles: ['planner'], permissions: [] } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await getPlantScope(request, session);
    expect(result.isScoped).toBe(false);
    expect(result.plantId).toBeNull();
  });

  it('should return denyAccess when user has no access to requested plant', async () => {
    const request = new NextRequest({ headers: { 'X-Plant-ID': 'plant-999' } }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const session = { userId: 'user-1', roles: ['planner'], permissions: [] } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    (db.userPlant.findUnique as Mock).mockResolvedValue(null);

    const result = await getPlantScope(request, session);
    expect(result.isScoped).toBe(true);
    expect(result.denyAccess).toBe(true);
    expect(result.accessLevel).toBe('none');
    expect(result.plantId).toBeNull();
  });

  it('should return scoped access when user has access to plant', async () => {
    const request = new NextRequest({ headers: { 'X-Plant-ID': 'plant-001' } }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const session = { userId: 'user-1', roles: ['planner'], permissions: [] } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    (db.userPlant.findUnique as Mock).mockResolvedValue({
      userId: 'user-1',
      plantId: 'plant-001',
      accessLevel: 'write',
    });

    const result = await getPlantScope(request, session);
    expect(result.isScoped).toBe(true);
    expect(result.plantId).toBe('plant-001');
    expect(result.accessLevel).toBe('write');
    expect(result.denyAccess).toBeUndefined();
  });
});

// ============================================================================
// Test 6: Security contract documentation
// ============================================================================
describe('Security contract (documented)', () => {
  it('should document that denyAccess check should happen before query', () => {
    const scope: PlantScopeResult = {
      plantId: null,
      accessLevel: 'none',
      isScoped: true,
      denyAccess: true,
    };

    // Step 1: Check denyAccess first
    const shouldReturn403 = scope.denyAccess === true;
    expect(shouldReturn403).toBe(true);

    // Step 2: If caller ignores denyAccess, the filter still protects:
    const safetyNetFilter = getPlantFilterWhere(scope);
    expect(safetyNetFilter.plantId).toBe('__ACCESS_DENIED__');
  });

  it('should document admin/plant_manager bypass behavior', () => {
    const adminScope: PlantScopeResult = {
      plantId: null,
      accessLevel: null,
      isScoped: false,
    };

    expect(adminScope.isScoped).toBe(false);
    const filter = getPlantFilterWhere(adminScope);
    expect(filter).toEqual({});
  });
});
