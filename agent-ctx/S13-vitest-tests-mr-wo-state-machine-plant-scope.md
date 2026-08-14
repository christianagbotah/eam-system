# S13: Vitest Tests for MR→WO Conversion, State Machine, and Plant Scope

## Task
Write Vitest tests for three modules:
1. `repairPlanning.service.ts` — MR→WO conversion domain service
2. `state-machine.ts` — State machine with transaction support
3. `plant-scope.ts` — Multi-plant data isolation

## Files Created

### 1. `/src/services/__tests__/repairPlanning.service.test.ts` (34 tests)
- **Type contract tests**: Verifies all exported types (`SessionLike`, `ConvertMRToWOPayload`, `ConvertMRToWOResult`, `ConversionNotification`)
- **Payload structure tests**: All fields accessible, all optional, full coverage
- **Result type tests**: Success, error, and conflict scenarios
- **SessionLike contract**: userId required, roles as string array, empty roles allowed
- **Priority preservation logic**: Documents the `payload.priority || mr.priority || 'medium'` chain
- **Assignment type validation**: Only `'direct'` and `'via_supervisor'` accepted
- **Team member validation**: Requires userId and role, allows undefined/empty
- **Tool vs material distinction**: Parts use `itemId`, tools use `toolId`; documents `WorkOrderMaterial` (planned) vs `RepairToolRequest` (planner_suggested)
- **Function contract tests**: MR not found, invalid team members, P2002 race condition, generic error handling
- **WO type and trade activity values**: Documents all valid enum values
- **WO number format**: Documents `WO-YYYYMM-NNNN` format with 4-digit padding

Uses `vi.hoisted()` and `vi.mock()` for DB/state-machine dependencies. Tests the function's error paths (MR not found, team member validation, P2002 race condition) with mocked DB.

### 2. `/src/lib/__tests__/state-machine.test.ts` (16 tests)
- **checkTransition tx support**: Verifies `tx` parameter uses provided client instead of `db`
- **checkTransition role checks**: Admin bypass, role mismatch, missing rule
- **executeTransition tx support**: Options accept `tx`, uses tx for all operations
- **Backward compatibility**: tx is optional in both `checkTransition` and `executeTransition`
- **extraData passthrough**: Extra fields merged into update payload
- **maintenance_request entity type**: Full flow with tx including MR→converted transition
- **EntityType union type**: Documents `'work_order' | 'maintenance_request'`
- **getAvailableTransitions**: Exported as function, returns array with correct shape
- **requiresReason contract**: Documents the reason enforcement pattern

### 3. `/src/lib/__tests__/plant-scope.test.ts` (25 tests)
- **PlantScopeResult type**: denyAccess optional, all access levels, unscoped/scoped/denied variants
- **Fail-closed behavior**: Documents that denied access returns `denyAccess: true` + sentinel filter
- **getPlantFilterWhere (pure)**: Empty when unscoped, plantId when scoped, sentinel when denied, custom field support
- **applyPlantScope (pure)**: Merges filter, doesn't mutate original, custom field, fail-closed sentinel
- **getPlantScope integration**: Admin bypass, plant_manager bypass, no header, denied access, granted access
- **Security contract**: Documents the `if (denyAccess) return 403` pattern and safety-net sentinel filter

Mocks `@/lib/db`, `@/lib/auth`, and `next/server` to prevent Prisma client initialization.

## Test Results
```
✓ src/lib/__tests__/plant-scope.test.ts (25 tests)
✓ src/lib/__tests__/state-machine.test.ts (16 tests)
✓ src/services/__tests__/repairPlanning.service.test.ts (34 tests)

Test Files  3 passed (3)
     Tests  75 passed (75)
```

## Notes
- Vitest was already configured (`vitest.config.ts` with jsdom env, `@vitejs/plugin-react`, path aliases)
- Used `vi.hoisted()` pattern (matching existing test convention in `workflow.engine.test.ts`)
- The `requiresReason` enforcement inside `executeTransition` was tested at the type-contract level due to the complexity of mocking the internal `checkTransition` call from within `executeTransition`
- Plant-scope `getPlantFilterWhere` and `applyPlantScope` are pure functions tested without mocks; `getPlantScope` is tested with mocked DB and auth
