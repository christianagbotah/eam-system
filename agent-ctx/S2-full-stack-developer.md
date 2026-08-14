# Task S2: Fix plant-scope.ts fail-open security vulnerability

## Status: COMPLETED

## Work Log
- Read worklog.md for project context
- Read current `/home/z/my-project/src/lib/plant-scope.ts` (117 lines)
- Identified the fail-open vulnerability on original line 54-57: when user sends `X-Plant-ID` without access, returned `{ isScoped: false }` giving unscoped (all-data) view
- Confirmed syntax on line 112 (`if (Object.keys(plantFilter).length === 0)`) was already correct in the current file
- Rewrote the file with all required fixes
- Verified no lint errors introduced (zero mentions of plant-scope.ts in lint output)

## Changes Made

### 1. `PlantScopeResult` interface
- Added `'none'` to the `accessLevel` union type
- Added optional `denyAccess?: boolean` field with JSDoc

### 2. `getPlantScope()` — Fail-closed fix
- **Before (vulnerable)**: When user lacks access to requested plant → returned `{ isScoped: false }` (sees ALL data)
- **After (secure)**: When user lacks access to requested plant → returns `{ isScoped: true, plantId: null, accessLevel: 'none', denyAccess: true }`
- Admin/plant_manager and no-header cases remain unchanged (`isScoped: false`)

### 3. `getPlantFilterWhere()` — Deny access filter
- Added check for `plantScope.denyAccess` at the top
- When true, returns `{ [plantIdField]: '__ACCESS_DENIED__' }` — a sentinel that matches zero rows in Prisma
- This ensures that even if callers don't check `denyAccess`, the query returns nothing (defense in depth)

### 4. `applyPlantScope()` — No signature change needed
- Already delegates to `getPlantFilterWhere()`, so the deny-access filter flows through automatically
- Updated JSDoc with security note about `denyAccess`

## Behavior Matrix (post-fix)
| Scenario | isScoped | plantId | denyAccess | Effect |
|---|---|---|---|---|
| Admin/plant_manager | false | null | — | Sees all plants |
| No X-Plant-ID header | false | null | — | Sees all plants |
| Valid X-Plant-ID + access | true | set | — | Scoped to that plant |
| Invalid X-Plant-ID, no access | true | null | **true** | 403 or empty result set |
