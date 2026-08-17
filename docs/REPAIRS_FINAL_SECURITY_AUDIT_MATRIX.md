# Repairs — Final Security & UAT Harness Audit Matrix

**Branch**: `fix/repairs-final-uat-gate`
**Base**: `77c42d28` (UAT harness correction gate)
**Status**: REPAIRS/RWOP PILOT VALIDATION BLOCKED

---
## Method/Action Security Matrix — Repairs API Routes

### Legend
- **Auth**: Authentication required (401 if missing)
- **Perm**: RBAC permission/role check
- **Plant**: Plant scope applied (list filter + IDOR)
- **denyAccess**: Explicit denyAccess 403 check
- **Team**: Team/ownership rule enforced
- **Status**: Expected HTTP status for unauthorized access

### Collection Routes (GET list + POST create)

| Route | Method | Auth | Perm | Plant List | Plant Create | Expected Denial |
|-------|--------|------|------|-----------|-------------|----------------|
| `/api/maintenance-requests` | GET | ✅ | `mr.view` | ✅ accessiblePlantIds | N/A | 403 |
| `/api/maintenance-requests` | POST | ✅ | `mr.create` | N/A | ✅ canAccessPlant + asset cross-plant | 403 |
| `/api/work-orders` | GET | ✅ | `wo.view` | ✅ accessiblePlantIds | N/A | 403 |
| `/api/work-orders` | POST | ✅ | `wo.create` | N/A | ✅ canAccessPlant + asset/MR cross-plant | 403 |
| `/api/repairs/material-requests` | GET | ✅ | `mat_req.view` | ✅ ALWAYS applyPlantScope | N/A | 403 |
| `/api/repairs/tool-requests` | GET | ✅ | `tool_req.view` | ✅ ALWAYS applyPlantScope | N/A | 403 |
| `/api/shift-handovers` | GET | ✅ | `sh.view` | ✅ ALWAYS nested WO plant | N/A | 403 |
| `/api/shift-handovers` | POST | ✅ | `sh.create` + team check | N/A | ✅ WO plant access + team | 403 |
| `/api/inventory` | GET | ✅ | `inv.view` | ✅ ALWAYS applyPlantScope | N/A | 403 |
| `/api/inventory` | POST | ✅ | `inv.create` | N/A | ✅ canAccessPlant(body.plantId) | 403 |
| `/api/assets` | GET | ✅ | `assets.view` | ✅ ALWAYS applyPlantScope | N/A | 403 |
| `/api/assets` | POST | ✅ | `assets.create` | N/A | ✅ canAccessPlant(body.plantId) | 403 |
| `/api/pm-schedules` | GET | ✅ | `wo.view` | ✅ ALWAYS nested Asset plant | N/A | 403 |
| `/api/pm-schedules` | POST | ✅ | `wo.create` | N/A | ✅ canAccessPlant(asset.plantId) | 403 |
| `/api/pm-triggers` | GET | ✅ | `wo.view` | ✅ ALWAYS nested Schedule→Asset | N/A | 403 |
| `/api/pm-triggers` | POST | ✅ | `wo.create` | N/A | ✅ canAccessPlant(schedule→asset plant) | 403 |
| `/api/analytics` | GET | ✅ | role-based | ✅ IN clause SQL | N/A | (zero data) |
| `/api/dashboard/stats` | GET | ✅ | role-based | ✅ IN clause SQL | N/A | (zero data) |
| `/api/repairs/kpi` | GET | ✅ | role-based | ✅ getPlantFilterWhere | N/A | (zero data) |

### Direct-ID Routes (GET/PUT/DELETE + POST actions)

| Route | Method | Auth | Perm | Plant Scope | Team/Ownership | Expected Denial |
|-------|--------|------|------|------------|---------------|----------------|
| `/api/work-orders/[id]` | GET | ✅ | `wo.view` | ✅ canAccessPlant | ✅ view_own | 403/404 |
| `/api/work-orders/[id]` | PUT | ✅ | role-based | ✅ canAccessPlant | ✅ locked/verified/closed | 403 |
| `/api/work-orders/[id]/start` | POST | ✅ | `wo.start` | ✅ denyAccess + canAccessPlant | N/A | 403 |
| `/api/work-orders/[id]/complete` | POST | ✅ | `wo.complete` | ✅ denyAccess + canAccessPlant | N/A | 403 |
| `/api/work-orders/[id]/handover` | POST | ✅ | `sh.create` OR team | ✅ denyAccess + canAccessPlant | ✅ assigned/team | 403 |
| `/api/work-orders/[id]/rework` | POST | ✅ | role-based | ✅ denyAccess + canAccessPlant | N/A | 403 |
| `/api/work-orders/[id]/attachments` | GET | ✅ | `wo.view` | ✅ (via WO) | N/A | 403 |
| `/api/work-orders/[id]/attachments` | POST | ✅ | `wo.complete` | ✅ (via WO) | ✅ locked/closed guard | 403 |
| `/api/work-orders/[id]/measurements` | GET/POST | ✅ | `wo.view` | ✅ (via WO) | N/A | 403 |
| `/api/work-orders/[id]/capabilities` | GET | ✅ | `wo.view` | ✅ (via WO) | N/A | 403 |
| `/api/maintenance-requests/[id]` | GET | ✅ | `mr.view` | ✅ canAccessPlant | ✅ view_own | 403/404 |
| `/api/maintenance-requests/[id]` | PUT | ✅ | role-based | N/A | ✅ ownership | 403 |
| `/api/maintenance-requests/[id]` | DELETE | ✅ | role-based | N/A | ✅ ownership | 403 |
| `/api/repairs/material-requests/[id]` | GET | ✅ | `mat_req.view` | ✅ (via WO) | N/A | 403 |
| `/api/repairs/material-requests/[id]` | PUT | ✅ | role-based | ✅ (via WO) | ✅ ownership | 403 |
| `/api/repairs/material-requests/[id]` | DELETE | ✅ | role-based | ✅ (via WO) | ✅ ownership | 403 |
| `/api/repairs/material-requests/[id]` | POST (supervisor_approve/reject) | ✅ | supervisor/manager role | ✅ (via WO) | N/A | 403 |
| `/api/repairs/material-requests/[id]` | POST (storekeeper_approve/reject) | ✅ | store_keeper/inv_manager | ✅ (via WO) | N/A | 403 |
| `/api/repairs/material-requests/[id]` | POST (issue) | ✅ | **store_keeper ONLY** | ✅ (via WO) | N/A | 403 |
| `/api/repairs/material-requests/[id]` | POST (record_return) | ✅ | **store_keeper ONLY** | ✅ (via WO) | N/A | 403 |
| `/api/repairs/tool-requests/[id]` | GET | ✅ | `tool_req.view` | ✅ (via plantId) | N/A | 403 |
| `/api/repairs/tool-requests/[id]` | PUT | ✅ | role-based | ✅ (via plantId) | ✅ ownership | 403 |
| `/api/repairs/tool-requests/[id]` | DELETE | ✅ | role-based | ✅ (via plantId) | ✅ ownership | 403 |
| `/api/repairs/tool-requests/[id]` | POST (supervisor_approve/reject) | ✅ | supervisor/manager role | ✅ (via plantId) | N/A | 403 |
| `/api/repairs/tool-requests/[id]` | POST (storekeeper_approve/reject) | ✅ | store_keeper/tools_att | ✅ (via plantId) | N/A | 403 |
| `/api/repairs/tool-requests/[id]` | POST (issue) | ✅ | **store_keeper ONLY** | ✅ (via plantId) | N/A | 403 |
| `/api/repairs/tool-requests/[id]` | POST (return) | ✅ | requester/team | ✅ (via plantId) | N/A | 403 |
| `/api/repairs/tool-requests/[id]` | POST (storekeeper_confirm_return) | ✅ | **store_keeper ONLY** | ✅ (via plantId) | N/A | 403 |
| `/api/repairs/tool-requests/[id]` | POST (storekeeper_reject_return) | ✅ | **store_keeper ONLY** | ✅ (via plantId) | N/A | 403 |
| `/api/shift-handovers/[id]` | GET/PUT/DELETE | ✅ | role-based | ✅ canAccessPlant | N/A | 403 |
| `/api/shift-handovers/[id]/confirm` | POST | ✅ | **receivedById OR supervisor override** | ✅ (via WO) | ✅ designated recipient | 403 |
| `/api/shift-handovers/[id]` | PUT (status=confirmed) | — | — | — | — | **BLOCKED → use /confirm** |
| `/api/repairs/downtime/[id]` | GET | ✅ | role-based | ✅ canAccessPlant | N/A | 403 |
| `/api/repairs/downtime/[id]` | PUT | ✅ | role-based | ✅ **canAccessPlant (NEW)** | ✅ ownership | 403 |
| `/api/repairs/downtime/[id]` | DELETE | ✅ | admin | ✅ **canAccessPlant (NEW)** | N/A | 403 |
| `/api/quality-inspections/[id]` | GET | ✅ | role-based | ✅ canAccessPlant | N/A | 403 |
| `/api/quality-inspections/[id]` | PUT | ✅ | role-based | ✅ **canAccessPlant (NEW)** | N/A | 403 |
| `/api/quality-inspections/[id]` | DELETE | ✅ | admin | ✅ **canAccessPlant (NEW)** | N/A | 403 |
| `/api/safety-incidents/[id]` | GET | ✅ | role-based | ✅ canAccessPlant | N/A | 403 |
| `/api/safety-incidents/[id]` | PUT | ✅ | role-based | ✅ **canAccessPlant (NEW)** | N/A | 403 |
| `/api/safety-incidents/[id]` | DELETE | ✅ | admin | ✅ **canAccessPlant (NEW)** | N/A | 403 |
| `/api/repairs/tool-transfers/[id]` | GET | ✅ | role-based | ✅ canAccessPlant | N/A | 403 |
| `/api/repairs/tool-transfers/[id]` | POST (actions) | ✅ | role-based | ✅ canAccessPlant | N/A | 403 |

### Report Routes

| Route | Method | Plant Scope |
|-------|--------|------------|
| `/api/repairs/reports` | GET | ✅ effectivePlantId (systemWide → param, scoped → plantId, multi → undefined) |
| `/api/repairs/reports/detailed` | GET | ✅ effectivePlantId |
| `/api/repairs/reports/xlsx` | POST | ✅ ALWAYS filter (denyAccess → 403, scoped → exact, no-header → IN) |
| `/api/reports/maintenance` | GET | ✅ getPlantFilterWhere |
| `/api/reports/machine-availability` | GET | ✅ getPlantFilterWhere |

---
## Defect Fix Summary

| # | Defect | Status | Files Changed |
|---|--------|--------|--------------|
| 1 | No-header plant-scope list leaks | ✅ FIXED | 16 route files |
| 2 | Method-by-method plant-scope audit | ✅ FIXED | 6 files (PUT/DELETE added) |
| 3 | Store/tool custody authorization | ✅ FIXED | 2 files (issue role guards) |
| 4 | Plant-safe MR creation | ✅ FIXED | 1 file (canAccessPlant + asset cross-plant) |
| 5 | Plant-safe WO creation | ✅ FIXED | 1 file (canAccessPlant + asset/MR cross-plant) |
| 6 | Real Plant-B asset seed | ✅ FIXED | 1 file (UAT-PUMP-B-001) |
| 7 | Shift handover workflow | ✅ FIXED | 3 files (confirm endpoint, PUT block, WO handover auth) |
| 8 | Calibration dynamic dates | ✅ FIXED | 1 file (addDays/subDays) |
| 9 | Scenario J ID determinism | ✅ FIXED | 1 file (eliminate list lookups) |
| 10 | Calibration status semantics | ✅ FIXED | 1 file (zero-issue → keep status) |
| 11 | Cross-plant assertions | ✅ FIXED | 1 file (403/404 only, unchanged verification) |
| 12 | Playwright workers=1 | ✅ FIXED | 2 files (config + package.json) |
| 13 | True browser UAT | ✅ ADDED | 1 new file (scenario-a-browser-journey.spec.ts) |
| 14 | Real inventory/tool IDs | ✅ FIXED | 2 files (helpers + scenario A) |
| 15 | Material reconciliation | ✅ FIXED | 1 file (scenario A step A9) |
| 16 | Evidence upload test | ✅ FIXED | 2 files (helper + scenario A) |
| 17 | Labor/XLSX/PDF assertions | ✅ FIXED | 1 file (deterministic + binary validation) |
| 18 | Canonical transition self-healing | ✅ FIXED | 1 file (always upsert) |
| 19 | Build/typecheck accuracy | ✅ NOTED | next.config.ts has `ignoreBuildErrors: true` — build success is NOT TypeScript evidence |
| 20 | Static security audit matrix | ✅ DONE | This document |

---
## Known Remaining Items (Out of Scope for This Gate)

- `body.plantId || plantScope?.plantId || null` pattern without canAccessPlant validation exists in: quality-inspections, production-orders, iot/devices, safety-incidents, tools, meter-readings POST routes
- `typescript.ignoreBuildErrors = true` in next.config.ts — TypeScript type safety not enforced at build time
- Playwright tests cannot execute without real MariaDB + Redis infrastructure

---
## Quality Gate Results

- **Prisma validate**: ✅ PASS
- **Vitest**: ✅ 626/626 pass (619 existing + 7 new plant-scope tests)
- **ESLint**: ✅ 0 errors (34 pre-existing warnings)
- **Next.js build**: ✅ PASS (note: TS errors suppressed by ignoreBuildErrors)
- **Static audit**: ✅ No remaining `if (isScoped)` guard patterns in API routes
