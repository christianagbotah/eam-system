# Repairs/RWOP Pilot Validation Report — Hard UAT Gate

**Generated:** 2026-08-17T01:15:00Z  
**Starting commit:** `1f6d7445`  
**Ending commit:** `5ebee5d1`  
**origin/main:** `5ebee5d1a42f1c9ab9a2dfb49d64e3903b25adb9` **(MATCH)**

---

## 1. Starting / Ending Commit

| Metric | Value |
|--------|-------|
| Starting commit | `1f6d7445` |
| Ending commit | `5ebee5d1` |
| origin/main | `5ebee5d1` ✅ |
| Files changed | 20 |
| Lines added | +3,186 |
| Lines removed | -1,738 |

## 2. MariaDB Version/Environment

| Item | Status |
|------|--------|
| MariaDB available in sandbox | ❌ No (no sudo access) |
| Docker available | ❌ No |
| Schema validated via `prisma validate` | ✅ |
| Migration SQL verified (syntactic) | ✅ |
| Docker Compose provided | ✅ `docker-compose.uat.yml` (MariaDB 11.4 + Redis 7) |
| `prisma migrate deploy` executed | ❌ BLOCKED (no MariaDB instance) |

**Honest assessment:** The migration SQL is additive-only, syntactically valid MySQL/MariaDB DDL. It has NOT been executed against a real MariaDB instance in this environment. The Docker Compose file is provided for external staging execution.

## 3. Redis Version/Environment

| Item | Status |
|------|--------|
| Redis available in sandbox | ❌ No |
| BullMQ adapter code | ✅ Properly structured with Redis connection factory |
| In-memory fallback | ✅ Verified working |
| Real Redis test executed | ❌ BLOCKED (no Redis instance) |

**Honest assessment:** The queue system has a proper BullMQ adapter with graceful in-memory fallback. Real Redis/BullMQ validation requires the Docker Compose environment.

## 4. Migration Result

| Migration | Tables | Type | Verified |
|-----------|--------|------|----------|
| `20250101000000_phase3_repairs_calibration_idempotency` | `tool_calibration_requirements`, `idempotency_records` | Additive (CREATE IF NOT EXISTS) | SQL only |
| `20250102000000_labor_rates` | `labor_rates` + 2 columns on `work_orders` | Additive (CREATE + ALTER) | SQL only |

**Not executed against real MariaDB.** SQL validated by inspection.

## 5. Playwright Scenarios

| Scenario | File | Status | Notes |
|----------|------|--------|-------|
| UAT-01 Single Tech | scenario-a | ✅ Rewritten | API-driven lifecycle, 10 server-state assertions |
| UAT-02 Multi-Tech | scenario-b | ✅ Rewritten | Leader-only completion enforced |
| UAT-03 Supervisor Delegation | scenario-c | ✅ Rewritten | Delegation + assignment flow |
| UAT-04 Assistance | scenario-d | ✅ Rewritten | Request + approval + join |
| UAT-05 Rework | scenario-e | ✅ Rewritten | Complete → rework → re-complete → verify → close |
| UAT-06 Tool Calibration | scenario-j | ✅ Rewritten | API-level HTTP status assertions |
| UAT-07 Resource Blocking | scenario-g | ✅ Rewritten | Readiness blocker (422) verified |
| UAT-08 Shift Handover | scenario-f | ✅ Rewritten | Handover API + premature resume rejection |
| UAT-09 Cross-Plant Security | scenario-h | ✅ Rewritten | 11 operations, all asserting 403/404 |
| UAT-10 Offline Replay | scenario-i | ✅ Rewritten | Idempotency key prevents duplicate mutations |

**Execution against running app:** ❌ NOT EXECUTED. The scenarios require:
1. UAT seed data (users, plants, assets, tools, labor rates)
2. Authenticated sessions
3. The app running with test database

The seed script (`scripts/seed-repairs-uat.ts`) exists but has not been executed. Running the scenarios requires the Docker Compose staging environment.

### False-Positive Audit Results

| Pattern | Before | After |
|---------|--------|-------|
| `\|\| true` | 1 | 0 |
| `.catch(() => false)` on required actions | 50+ | 0 |
| `if (isVisible)` wrapping required actions | 50+ | 0 |
| `waitForTimeout` for state | 30+ | 0 |
| Pre-seeded WO fallback | 8/10 | 0/10 |
| Tests with no meaningful assertion | 5+ | 0 |
| **Total critical issues** | **94** | **0** |
| **Total issues** | **152** | **0** |

## 6. Manual UAT

| Category | Total | Pass | Fail | Blocked |
|----------|-------|------|------|--------|
| All items | 28 | 0 | 0 | 28 |

**Status: BLOCKED.** Manual UAT requires deployed staging environment with real MariaDB + Redis + seeded data + multiple browser sessions with role-separated accounts. Cannot be executed in this sandbox.

## 7. False-Positive Tests Removed

**152 total** — all 10 scenarios + auth helper completely rewritten. Zero false-positive patterns remain (verified by `rg` scan).

## 8. Defects Found/Fixed/Open

### Fixed During This Gate

| ID | Severity | Description |
|----|----------|-------------|
| REP-UAT-001 | BLOCKER | 152 false-positive assertions across all Playwright scenarios |
| REP-UAT-002 | MAJOR | Missing `/api/work-orders/[id]/handover` endpoint |
| REP-UAT-003 | MAJOR | Missing `/api/work-orders/[id]/rework` endpoint |

### Fixed in Prior Gate (RC1)

| ID | Severity | Description |
|----|----------|-------------|
| REP-UAT-004 | MAJOR | No plant scope on 5 WO mutation routes |
| REP-UAT-005 | MAJOR | Closed WO accepted measurements/attachments |
| REP-UAT-006 | BLOCKER | Labor cost always 0 (no rate structure) |
| REP-UAT-007 | MAJOR | Offline sync handlers lacked closed WO check |

### Open

| ID | Severity | Description |
|----|----------|-------------|
| REP-UAT-008 | MINOR | No ToolCalibrationRequirement creation API for E2E seeding |
| REP-UAT-009 | MINOR | MaintenancePages.tsx exceeds 500KB Babel threshold |
| REP-UAT-010 | INFRA | No real MariaDB/Redis in CI sandbox |

## 9. Labor Cost Reconciliation

### Unit Test Results (609/609 passing)

| Test | Rate | Hours | Expected Cost | Result |
|------|------|-------|---------------|--------|
| User-specific rate | GHS 50/hr | 2 | GHS 100 | ✅ |
| Trade-level fallback | GHS 60/hr | 3 | GHS 180 | ✅ |
| No rate configured | — | 2 | 0 + warning | ✅ |
| Plant-specific priority | GHS 40/hr (plant) vs 55 (global) | 1 | GHS 40 | ✅ |
| No invented rates | — | 5 | 0 (never invents) | ✅ |

### E2E Reconciliation
❌ BLOCKED — requires real MariaDB with seeded labor rates and closed WO data.

### Historical Cost Stability
The `laborRateApplied` and `laborCurrency` fields are snapshotted on WO closure. Rate changes after closure do not affect closed WOs (verified at service layer — the rate is written to the WO record, not recalculated on read).

## 10. Queue/Retry Result

❌ BLOCKED — no Redis instance available. Code-level verification:
- BullMQ adapter structured with proper connection factory
- In-memory fallback working
- Job failure does not reverse committed WO transactions (notifications are post-transaction)

## 11. Cross-Plant Security Result

### Code-Level Verification
All WO mutation routes now enforce plant scope:
- `/api/work-orders/[id]/complete` ✅
- `/api/work-orders/[id]/start` ✅
- `/api/work-orders/[id]/capabilities` ✅
- `/api/work-orders/[id]/measurements` ✅
- `/api/work-orders/[id]/attachments` ✅
- `/api/sync/offline` ✅ (per-record scope)
- `/api/work-orders/[id]/handover` ✅ (new)
- `/api/work-orders/[id]/rework` ✅ (new)

### E2E Execution
❌ BLOCKED — requires two seeded plants with separate user accounts. Playwright scenario-h is written with 11 API-level 403/404 assertions but not executed.

## 12. Offline Idempotency Result

### Code-Level Verification
- `IdempotencyRecord` model with unique `key` constraint ✅
- `checkIdempotency()` / `recordIdempotency()` in all 10 mutation functions ✅
- SHA-256 response hash for conflict detection ✅
- Duplicate key returns stored response without re-execution ✅

### E2E Execution
❌ BLOCKED — Playwright scenario-i written with proper idempotency assertions but not executed.

## 13. Performance Smoke Results

❌ NOT EXECUTED. Requires MariaDB with 10K+ MRs, 25K+ WOs, 100K+ time logs. Cannot generate this scale in SQLite sandbox.

Known concerns (code-level):
- MaintenancePages.tsx: 9300+ lines, exceeds 500KB Babel threshold
- WO list queries include relations (potential N+1)

## 14. Production Build Result

| Check | Result |
|-------|--------|
| Dev server starts | ✅ Port 3000, 200 OK |
| Login page renders | ✅ Verified via browser |
| Prisma validate | ✅ |
| Vitest | ✅ 609/609 (23 files) |
| Lint | ✅ 0 errors, 34 warnings |
| TypeScript | ✅ Compiles |
| Production build | ⚠️ Not run (`bun run build` not permitted in sandbox) |

## 15. Release Decision

---

# REPAIRS/RWOP PILOT VALIDATION BLOCKED

### Blocking Items

| # | Blocker | Reason | Resolution Required |
|---|---------|--------|-------------------|
| 1 | **No real MariaDB** | Cannot execute `prisma migrate deploy` | Deploy to staging with MariaDB 11.4+ |
| 2 | **No real Redis** | Cannot test BullMQ job queue/retry/failure | Deploy with Redis 7+ |
| 3 | **Playwright not executed** | 10 scenarios rewritten but not run | Seed UAT data + run against staging |
| 4 | **Manual UAT not executed** | 28 items blocked | Deploy staging + role-separated accounts |
| 5 | **Labor cost not E2E reconciled** | Unit tests pass, no E2E proof | Closed WO with known rates on MariaDB |
| 6 | **Production build not verified** | `bun run build` not available in sandbox | Run in CI/CD pipeline |
| 7 | **Performance smoke not run** | No scale data in SQLite | Generate on MariaDB staging |

### What IS Verified

- ✅ All Phase 3.5 code on `origin/main` (commit `5ebee5d1`)
- ✅ 609/609 unit/integration tests passing
- ✅ 0 lint errors
- ✅ Prisma schema valid
- ✅ 152 false-positive Playwright patterns eliminated
- ✅ 10 Playwright scenarios rewritten with API-driven fail-fast assertions
- ✅ 2 missing API routes created (handover, rework)
- ✅ 7 security guards (plant scope + closed WO immutability)
- ✅ Labor rate structure with 5 unit tests
- ✅ Authoritative cost calculation (no client trust)
- ✅ Idempotency infrastructure
- ✅ Docker Compose for staging deployment

### What Remains

Deploy `docker-compose.uat.yml`, run `prisma migrate deploy`, execute seed script, run Playwright, execute manual UAT, reconcile costs, run performance smoke.

---

**Status: Code-ready for staging deployment. Blocked on infrastructure.**