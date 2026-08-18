# Task 3 — Rewrite Scenario J for Real Tool Calibration E2E Testing

## Changes Made

### 1. Seed Fix (`scripts/seed-repairs-uat.ts`)
- **UAT-CAL-VALID calibrationStatus**: Changed from `'valid'` to `'calibrated'`. The `checkToolCalibration()` service only allows `calibrationStatus === 'calibrated'` to pass unblocked. The old value `'valid'` would have been blocked.
- **Storekeeper role slug**: Added `'store_keeper'` alongside `'storekeeper'` for `uat_storekeeper`. The route handler's permission gate checks `hasRole(session, 'store_keeper')`, not `'storekeeper'`. Without this, the storekeeper couldn't approve or issue tool requests.

### 2. API Helper (`e2e/repairs/helpers/api.ts`)
- Added `lookupToolId(token, toolName)` with `toolCache` for resolving tool names (e.g. `'UAT-CAL-VALID'`) to DB IDs via `GET /api/tools?search=...`

### 3. Scenario J Spec (`e2e/repairs/scenario-j-tool-calibration.spec.ts`)
Complete rewrite as single `test()` with 5 `test.step()` calls:

| Step | Purpose | Key Assertions |
|------|---------|----------------|
| J1 | Create & start WO (prerequisite) | WO status `in_progress` |
| J2 | VALID calibration → issue succeeds | status 200, item `quantityIssued >= 1`, ToolTransaction (checkout) exists |
| J3 | EXPIRED calibration → soft block | status 200, warnings contain 'calibration'/'BLOCKED', item `quantityIssued = 0`, `availabilityStatus = 'unavailable'`, no ToolTransaction |
| J4 | FAILED calibration → soft block | Same pattern as J3 |
| J5 | Technician issue of expired tool | Calibration block applies regardless of caller role |

## Design Decisions

### Soft-block vs Hard-reject
The `atomicIssueTools` service implements a **soft-block** pattern for calibration violations: the issue returns HTTP 200 with warnings, and blocked items are skipped (no ToolTransaction, no quantityIssued). The request still transitions to `issued` status. The test assertions match this actual behavior rather than a hypothetical hard 400/422 reject.

### J5 — Emergency Override
Since the issue API has no `override` flag parameter and no API endpoint exists for `requestEmergencyOverride`, J5 tests that a technician calling the issue action directly (bypassing the storekeeper) still gets the calibration block. This proves calibration enforcement is role-agnostic.
