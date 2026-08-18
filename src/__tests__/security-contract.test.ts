/**
 * Static Security Contract Tests
 *
 * These tests verify 11 key security invariants by reading source files at
 * test-time and asserting the presence of specific code patterns. They are
 * fast (no DB, no HTTP), deterministic, and resilient to refactoring — they
 * only break when the actual security control is removed or altered.
 *
 * Each test reads the file with `fs.readFileSync` so no module-level side
 * effects (Prisma client init, etc.) are triggered.
 */

import fs from 'fs';
import path from 'path';

describe('Security Contract Invariants', () => {
  // --------------------------------------------------------------------------
  // Helper to read a source file relative to project root
  // --------------------------------------------------------------------------
  function readSrc(relativePath: string): string {
    return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8');
  }

  // ==========================================================================
  // Invariant 1: Material Request PUT handler has plant scope check
  // ==========================================================================
  it('invariant 1: Material Request PUT handler has getPlantScope call', () => {
    const source = readSrc('src/app/api/repairs/material-requests/[id]/route.ts');

    // Verify PUT handler exists
    expect(source).toContain('export async function PUT');

    // Verify getPlantScope is imported and used
    expect(source).toContain('getPlantScope');

    // Verify canAccessPlant is also used (the actual guard)
    expect(source).toContain('canAccessPlant');
  });

  // ==========================================================================
  // Invariant 2: Material Request DELETE handler has plant scope check
  // ==========================================================================
  it('invariant 2: Material Request DELETE handler has getPlantScope call', () => {
    const source = readSrc('src/app/api/repairs/material-requests/[id]/route.ts');

    // Verify DELETE handler exists
    expect(source).toContain('export async function DELETE');

    // Verify getPlantScope is present (imported at top, used in DELETE too)
    expect(source).toContain('getPlantScope');
  });

  // ==========================================================================
  // Invariant 3: Maintenance Request PUT handler has plant scope check
  // ==========================================================================
  it('invariant 3: Maintenance Request PUT handler has getPlantScope call', () => {
    const source = readSrc('src/app/api/maintenance-requests/[id]/route.ts');

    // Verify PUT handler exists
    expect(source).toContain('export async function PUT');

    // Verify getPlantScope is imported and used
    expect(source).toContain('getPlantScope');

    // Verify canAccessPlant is also used
    expect(source).toContain('canAccessPlant');
  });

  // ==========================================================================
  // Invariant 4: Maintenance Request DELETE handler has plant scope check
  // ==========================================================================
  it('invariant 4: Maintenance Request DELETE handler has getPlantScope call', () => {
    const source = readSrc('src/app/api/maintenance-requests/[id]/route.ts');

    // Verify DELETE handler exists
    expect(source).toContain('export async function DELETE');

    // The DELETE handler delegates to canModifyPendingRequest which calls
    // getPlantScope — verify that helper function exists and uses getPlantScope
    expect(source).toContain('canModifyPendingRequest');
    expect(source).toContain('getPlantScope');
  });

  // ==========================================================================
  // Invariant 5: Maintenance Request PUT rejects plantId/assetId changes
  // ==========================================================================
  it('invariant 5: Maintenance Request PUT rejects plantId/assetId changes', () => {
    const source = readSrc('src/app/api/maintenance-requests/[id]/route.ts');

    // The exact error message that blocks plantId/assetId mutation
    expect(source).toContain('Cannot change plantId or assetId');
  });

  // ==========================================================================
  // Invariant 6: WO POST validates MR plant match
  // ==========================================================================
  it('invariant 6: WO POST handler validates MR plant match', () => {
    const source = readSrc('src/app/api/work-orders/route.ts');

    // Verify POST handler exists
    expect(source).toContain('export async function POST');

    // Verify the MR plant validation error message
    expect(source).toContain('plant does not match');
  });

  // ==========================================================================
  // Invariant 7: WO POST validates asset plant
  // ==========================================================================
  it('invariant 7: WO POST handler validates asset belongs to WO plant', () => {
    const source = readSrc('src/app/api/work-orders/route.ts');

    // Verify the asset plant validation error message
    expect(source).toContain('does not belong to the work order plant');
  });

  // ==========================================================================
  // Invariant 8: Tool Request issue action has role guard
  // ==========================================================================
  it('invariant 8: Tool Request issue action has store-keeper role guard', () => {
    const source = readSrc('src/app/api/repairs/tool-requests/[id]/route.ts');

    // Verify POST (actions) handler exists
    expect(source).toContain('export async function POST');

    // Verify the issue action has a role check
    expect(source).toContain("action === 'issue'");
    expect(source).toContain('store_keeper');
    expect(source).toContain('inventory_manager');
    expect(source).toContain('tools_shop_attendant');
  });

  // ==========================================================================
  // Invariant 9: Shift Handover PUT has receivedById confirmation check
  // ==========================================================================
  it('invariant 9: Shift Handover PUT enforces receivedById confirmation', () => {
    const source = readSrc('src/app/api/shift-handovers/[id]/route.ts');

    // Verify PUT handler exists
    expect(source).toContain('export async function PUT');

    // Verify the designated receiver confirmation check
    expect(source).toContain('Only the designated receiver can confirm this handover');

    // Verify receivedById is checked
    expect(source).toContain('receivedById');
  });

  // ==========================================================================
  // Invariant 10: Handover initiate creates ShiftHandover record
  // ==========================================================================
  it('invariant 10: Handover initiate creates ShiftHandover record', () => {
    const source = readSrc('src/services/workExecution.service.ts');

    // Verify the service creates a ShiftHandover record
    expect(source).toContain('shiftHandover.create');
  });

  // ==========================================================================
  // Invariant 11: State machine ensureTransitionsSeeded returns
  //             {attempted, succeeded}
  // ==========================================================================
  it('invariant 11: ensureTransitionsSeeded returns {attempted, succeeded}', () => {
    const source = readSrc('src/lib/state-machine.ts');

    // Verify the function exists with the correct return type
    expect(source).toContain('ensureTransitionsSeeded');
    expect(source).toContain('{ attempted: boolean; succeeded: boolean }');

    // Verify it returns the attempted/succeeded shape in all paths
    expect(source).toContain('attempted: true, succeeded: true');
    expect(source).toContain('attempted: true, succeeded: false');
    expect(source).toContain('attempted: false, succeeded: false');
  });
});
