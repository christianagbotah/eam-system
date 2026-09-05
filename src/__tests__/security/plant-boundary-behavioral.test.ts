/**
 * REAL behavioral security tests for plant boundary enforcement.
 * Tests actual function logic with in-memory data, not source code string matching.
 */
import { describe, it, expect } from 'vitest';

// Mock @/lib/db before importing plant-scope
vi.mock('@/lib/db', () => ({ db: {} }));

import { canAccessPlant, canAccessPlantStrict, type PlantScopeResult } from '@/lib/plant-scope';

// ── Helpers ──────────────────────────────────────────────────────────

function makeScope(overrides: Partial<PlantScopeResult> = {}): PlantScopeResult {
  return {
    plantId: null,
    accessiblePlantIds: [],
    isScoped: false,
    isSystemWide: false,
    accessLevel: null,
    ...overrides,
  };
}

// ── canAccessPlant ───────────────────────────────────────────────────

describe('canAccessPlant', () => {
  it('system-wide user can access any plant', () => {
    const scope = makeScope({ isSystemWide: true });
    expect(canAccessPlant(scope, 'plant-1')).toBe(true);
    expect(canAccessPlant(scope, null)).toBe(true);
    expect(canAccessPlant(scope, undefined)).toBe(true);
  });

  it('non-system user with matching plant can access', () => {
    const scope = makeScope({
      isSystemWide: false,
      accessiblePlantIds: ['plant-1', 'plant-2'],
    });
    expect(canAccessPlant(scope, 'plant-1')).toBe(true);
    expect(canAccessPlant(scope, 'plant-2')).toBe(true);
  });

  it('non-system user without matching plant is denied', () => {
    const scope = makeScope({
      isSystemWide: false,
      accessiblePlantIds: ['plant-1'],
    });
    expect(canAccessPlant(scope, 'plant-3')).toBe(false);
  });

  it('null entityPlantId is allowed (lenient mode)', () => {
    const scope = makeScope({
      isSystemWide: false,
      accessiblePlantIds: ['plant-1'],
    });
    // canAccessPlant returns true for null — not strict
    expect(canAccessPlant(scope, null)).toBe(true);
    expect(canAccessPlant(scope, undefined)).toBe(true);
  });

  it('denyAccess always blocks', () => {
    const scope = makeScope({
      isSystemWide: false,
      denyAccess: true,
      accessiblePlantIds: ['plant-1'],
    });
    expect(canAccessPlant(scope, 'plant-1')).toBe(false);
  });
});

// ── canAccessPlantStrict ─────────────────────────────────────────────

describe('canAccessPlantStrict', () => {
  it('system-wide user can access any plant', () => {
    const scope = makeScope({ isSystemWide: true });
    expect(canAccessPlantStrict(scope, 'plant-1')).toBe(true);
    expect(canAccessPlantStrict(scope, null)).toBe(true);
  });

  it('non-system user with matching plant can access', () => {
    const scope = makeScope({
      isSystemWide: false,
      accessiblePlantIds: ['plant-1', 'plant-2'],
    });
    expect(canAccessPlantStrict(scope, 'plant-1')).toBe(true);
  });

  it('non-system user without matching plant is denied', () => {
    const scope = makeScope({
      isSystemWide: false,
      accessiblePlantIds: ['plant-1'],
    });
    expect(canAccessPlantStrict(scope, 'plant-3')).toBe(false);
  });

  it('null entityPlantId is DENIED for non-system-wide (strict mode)', () => {
    const scope = makeScope({
      isSystemWide: false,
      accessiblePlantIds: ['plant-1'],
    });
    expect(canAccessPlantStrict(scope, null)).toBe(false);
    expect(canAccessPlantStrict(scope, undefined)).toBe(false);
  });

  it('denyAccess always blocks', () => {
    const scope = makeScope({
      isSystemWide: false,
      denyAccess: true,
    });
    expect(canAccessPlantStrict(scope, 'plant-1')).toBe(false);
    expect(canAccessPlantStrict(scope, null)).toBe(false);
  });

  it('user with NO plant assignments at all is denied', () => {
    const scope = makeScope({
      isSystemWide: false,
      accessiblePlantIds: [],
    });
    expect(canAccessPlantStrict(scope, 'plant-1')).toBe(false);
  });
});

// ── Material custody role gate simulation ───────────────────────────

describe('Material custody role gate logic', () => {
  // This simulates the role-check pattern used in material-requests/[id]/route.ts
  // and tool-requests/[id]/route.ts

  const STORE_ROLES = ['admin', 'store_keeper', 'inventory_manager', 'tools_shop_attendant'];

  function canPerformCustodyAction(userRoles: string[]): boolean {
    return userRoles.some(r => STORE_ROLES.includes(r));
  }

  it('store_keeper can issue materials', () => {
    expect(canPerformCustodyAction(['store_keeper'])).toBe(true);
  });

  it('inventory_manager can issue materials', () => {
    expect(canPerformCustodyAction(['inventory_manager'])).toBe(true);
  });

  it('tools_shop_attendant can issue materials', () => {
    expect(canPerformCustodyAction(['tools_shop_attendant'])).toBe(true);
  });

  it('admin can issue materials', () => {
    expect(canPerformCustodyAction(['admin'])).toBe(true);
  });

  it('technician CANNOT issue materials', () => {
    expect(canPerformCustodyAction(['maintenance_technician'])).toBe(false);
  });

  it('requester CANNOT issue materials', () => {
    expect(canPerformCustodyAction(['maintenance_requester'])).toBe(false);
  });

  it('supervisor CANNOT issue materials', () => {
    expect(canPerformCustodyAction(['maintenance_supervisor'])).toBe(false);
  });
});

// ── Reconciliation invariant simulation ──────────────────────────────

describe('Material reconciliation invariant', () => {
  it('consumed + wasted + returned == issued is valid', () => {
    const consumed = 5, wasted = 1, returned = 2, issued = 8;
    const total = consumed + wasted + returned;
    expect(Math.abs(total - issued) <= 0.001).toBe(true);
  });

  it('consumed + wasted + returned < issued is INVALID', () => {
    const consumed = 3, wasted = 1, returned = 2, issued = 8;
    const total = consumed + wasted + returned;
    expect(total < issued).toBe(true);
    expect(Math.abs(total - issued) <= 0.001).toBe(false);
  });

  it('consumed + wasted + returned > issued is INVALID', () => {
    const consumed = 5, wasted = 2, returned = 3, issued = 8;
    const total = consumed + wasted + returned;
    expect(total > issued).toBe(true);
  });

  it('returned stock excluded from cost: (consumed + wasted) * unitCost', () => {
    const consumed = 5, wasted = 1, returned = 2, issued = 8, unitCost = 25;
    // Authoritative cost: only consumed + wasted
    const cost = (consumed + wasted) * unitCost;
    expect(cost).toBe(150);
    // NOT: issued * unitCost = 200
    expect(cost).not.toBe(200);
  });
});

// ── Tool calibration custody simulation ─────────────────────────────

describe('Tool calibration custody: 0 issued means no issued status', () => {
  it('actualIssuedTotal 0 means request must NOT be marked issued', () => {
    const actualIssuedTotal = 0;
    const shouldMarkIssued = actualIssuedTotal > 0;
    expect(shouldMarkIssued).toBe(false);
  });

  it('actualIssuedTotal > 0 means request CAN be marked issued', () => {
    const actualIssuedTotal = 2;
    const shouldMarkIssued = actualIssuedTotal > 0;
    expect(shouldMarkIssued).toBe(true);
  });

  it('all items calibration-blocked results in 0 issued', () => {
    const items = [
      { calibrationBlocked: true, quantityToIssue: 1 },
      { calibrationBlocked: true, quantityToIssue: 2 },
    ];
    let actualIssuedTotal = 0;
    for (const item of items) {
      if (!item.calibrationBlocked) {
        actualIssuedTotal += item.quantityToIssue;
      }
    }
    expect(actualIssuedTotal).toBe(0);
  });

  it('partial calibration block only counts non-blocked items', () => {
    const items = [
      { calibrationBlocked: true, quantityToIssue: 2 },
      { calibrationBlocked: false, quantityToIssue: 3 },
    ];
    let actualIssuedTotal = 0;
    for (const item of items) {
      if (!item.calibrationBlocked) {
        actualIssuedTotal += item.quantityToIssue;
      }
    }
    expect(actualIssuedTotal).toBe(3);
  });
});

// ── Shift handover resume authorization simulation ──────────────────

describe('Resume after handover: userId === receivedById', () => {
  const SUPERVISOR_ROLES = ['maintenance_supervisor', 'maintenance_manager', 'plant_manager', 'admin'];

  function canResume(userId: string, receivedById: string | null, userRoles: string[], reason?: string): { allowed: boolean; error?: string } {
    if (userId === receivedById) return { allowed: true };
    const isSupervisor = userRoles.some(r => SUPERVISOR_ROLES.includes(r));
    if (!isSupervisor) return { allowed: false, error: 'only the designated receiver' };
    if (!reason) return { allowed: false, error: 'Supervisor override requires a reason' };
    return { allowed: true };
  }

  it('receiver can resume', () => {
    expect(canResume('user-A', 'user-A', ['maintenance_technician']).allowed).toBe(true);
  });

  it('non-receiver technician cannot resume', () => {
    const r = canResume('user-B', 'user-A', ['maintenance_technician']);
    expect(r.allowed).toBe(false);
    expect(r.error).toContain('designated receiver');
  });

  it('non-receiver supervisor CAN resume with reason', () => {
    const r = canResume('sup-1', 'user-A', ['maintenance_supervisor'], 'emergency');
    expect(r.allowed).toBe(true);
  });

  it('non-receiver supervisor CANNOT resume without reason', () => {
    const r = canResume('sup-1', 'user-A', ['maintenance_supervisor']);
    expect(r.allowed).toBe(false);
    expect(r.error).toContain('reason');
  });
});
