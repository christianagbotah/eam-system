# Task ID: 17-18 — Verify and Harden Closed WO Immutability & Security

## Part A: Closed WO Immutability (Step 17)

### State Machine Verification
- **PASS**: `DEFAULT_WO_TRANSITIONS` in `src/lib/state-machine.ts` has ZERO transitions with `fromStatus: 'closed'`. No transition FROM 'closed' to any other status exists. This is the primary immutability gate.
- **PASS**: `executeTransition()` reads the current status from DB, then calls `checkTransition()` which queries `statusTransitions` table. If no matching rule is found, it returns `{ allowed: false }`.

### Service Layer Verification (workExecution.service.ts)

| Scenario | Protected By | Result |
|---|---|---|
| `submitCompletion()` on closed WO | State machine: no 'closed'→'completed' rule | **PASS** |
| `startWork()` on closed WO | State machine: no 'closed'→'in_progress' rule | **PASS** |
| `plannerClose()` on closed WO | Readiness requires 'verified' status + state machine | **PASS** |
| `cancelWorkOrder()` on closed WO | State machine: no 'closed'→'cancelled' rule | **PASS** |
| `pauseWork()/resumeWork()` on closed WO | State machine: no 'closed'→'on_hold' or 'closed'→'in_progress' | **PASS** |
| `requestRework()` on closed WO | State machine: no 'closed'→'in_progress' | **PASS** |

### Non-Transition Operations (API routes that bypass state machine)

| Route | Pre-Fix Status | Result |
|---|---|---|
| `POST /api/work-orders/[id]/time-logs` | Had `isLocked` + `status='closed'` check | **PASS** (no fix needed) |
| `POST /api/work-orders/[id]/materials` | Had `isLocked` + `status='closed'` check | **PASS** (no fix needed) |
| `POST /api/work-orders/[id]/personal-tools` | Had `isLocked` + `status='closed'` check | **PASS** (no fix needed) |
| `POST /api/work-orders/[id]/measurements` | **MISSING** both checks | **FIXED** ✅ |
| `POST /api/work-orders/[id]/attachments` | **MISSING** both checks | **FIXED** ✅ |

### Offline Sync Handlers (sync/offline/route.ts)

| Handler | Pre-Fix Status | Result |
|---|---|---|
| `handleCommentCreate` | Missing locked/closed check | **FIXED** ✅ |
| `handleTaskUpdate` | Missing locked/closed check | **FIXED** ✅ |
| `handleTimeLogCreate` | Had `isLocked` only, missing `status='closed'` and `status='verified'` | **FIXED** ✅ |
| `handleMeasurementCreate` | Missing locked/closed check | **FIXED** ✅ |
| `handleAssistanceCreate` | Had `isLocked` only, missing `status='closed'` | **FIXED** ✅ |

## Part B: Security Verification (Step 18)

| Route | Auth | Plant Scope | Role Check | Result |
|---|---|---|---|---|
| `GET /api/work-orders/[id]/capabilities` | ✅ getSession | ✅ getPlantScope | ✅ derived from WO assignment | **PASS** |
| `POST /api/work-orders/[id]/complete` | ✅ getSession | ❌ MISSING | ✅ hasPermission('work_orders.complete') | **FIXED** ✅ |
| `POST /api/work-orders/[id]/start` | ✅ getSession | ❌ MISSING | ✅ hasPermission('work_orders.start') | **FIXED** ✅ |
| `POST /api/sync/offline` | ✅ getSession | ❌ MISSING (per-record) | N/A (delegates to handlers) | **FIXED** ✅ |
| `POST /api/work-orders/[id]/measurements` | ✅ getSession | ❌ MISSING | ✅ hasPermission('work_orders.view') | **FIXED** ✅ |
| `POST /api/work-orders/[id]/attachments` | ✅ getSession | ❌ MISSING | ✅ hasPermission('work_orders.view') | **FIXED** ✅ |

## Part C: Closed WO API Protection

| Route | Closed WO Protection | HTTP Status on Rejection | Result |
|---|---|---|---|
| `POST /api/work-orders/[id]/complete` | State machine (no transition) | 400 (via service) | **PASS** (functionally blocked) |
| `POST /api/work-orders/[id]/start` | State machine (no transition) | 400 (via service) | **PASS** (functionally blocked) |
| `POST /api/work-orders/[id]/measurements` | Now checks `isLocked` + `status='closed'` | 409 Conflict | **FIXED** ✅ |
| `POST /api/work-orders/[id]/attachments` | Now checks `isLocked` + `status='closed'` | 409 Conflict | **FIXED** ✅ |

## Fixes Applied

### Files Modified:
1. **src/app/api/work-orders/[id]/measurements/route.ts**
   - Added `getPlantScope` import
   - Added plant scope check (IDOR protection) for both POST and GET
   - Added `isLocked` check → 409
   - Added `status === 'closed'` check → 409

2. **src/app/api/work-orders/[id]/attachments/route.ts**
   - Added `getPlantScope` import
   - Added plant scope check (IDOR protection) for POST
   - Added `isLocked` check → 409
   - Added `status === 'closed'` check → 409

3. **src/app/api/sync/offline/route.ts**
   - Added `getPlantScope` import
   - Added request-level plant scope check (denyAccess → 403)
   - Added per-record plant scope validation for WO-linked records
   - `handleCommentCreate`: Added `isLocked` + `status='closed'` guard
   - `handleTaskUpdate`: Added `isLocked` + `status='closed'` guard
   - `handleTimeLogCreate`: Added `status='closed'` + `status='verified'` guard
   - `handleMeasurementCreate`: Added `isLocked` + `status='closed'` guard
   - `handleAssistanceCreate`: Added `status='closed'` guard

4. **src/app/api/work-orders/[id]/complete/route.ts**
   - Added `db` import and `getPlantScope` import
   - Added plant scope check before calling service

5. **src/app/api/work-orders/[id]/start/route.ts**
   - Added `db` import and `getPlantScope` import
   - Added plant scope check before calling service

### Lint Results:
- `bun run lint`: 0 errors, 34 warnings (all pre-existing unused eslint-disable directives)
