# Repairs — Final Security & UAT Harness Audit Matrix

**Branch**: `fix/repairs-final-uat-integrated`
**Base**: `d4b89cbc` (20-defect gate) + `6a5480c0` (15-defect corrections)
**Status**: REPAIRS/RWOP PILOT VALIDATION BLOCKED
**Generated**: From actual code scan of all API route handlers

---

## Method/Action Security Matrix — Repairs API Routes

### Legend
- **Auth**: Authentication required (401 if missing)
- **Perm**: RBAC permission/role check
- **Plant**: Plant scope applied (list filter + IDOR)
- **denyAccess**: Explicit `plantScope.denyAccess` 403 guard
- **✅** = Present and verified
- **⚠️** = Partial — see Notes
- **❌** = Missing
- **N/A** = Not applicable (e.g., user-scoped endpoint)

---

### Maintenance Requests

| Method | Route | Auth | Perm | Plant | denyAccess | Notes |
|--------|-------|:----:|:----:|:-----:|:----------:|-------|
| GET | `/api/maintenance-requests` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `applyPlantScope(where, plantScope)`. Role-based: `view_own` → `requestedBy`; supervisor → supervised depts; technician → own + WO-assigned |
| POST | `/api/maintenance-requests` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, body.plantId)`. Derives plant from body → primary userPlant. Cross-plant asset blocked |
| GET | `/api/maintenance-requests/[id]` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, mr.plantId)`. IDOR: `view_own` returns 404 (not 403) for other users' MRs |
| PUT | `/api/maintenance-requests/[id]` | ✅ | ✅ | ✅ | ✅ | Via `canModifyPendingRequest` helper. Rejects `plantId`/`assetId` changes. Non-pending: notes-only by admin/supervisor |
| DELETE | `/api/maintenance-requests/[id]` | ✅ | ✅ | ✅ | ✅ | Via `canModifyPendingRequest` helper. Only `pending` requests; only requester or admin |
| POST | `/api/maintenance-requests/[id]/approve` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['maintenance_requests.approve'])` + department supervisor check but NO plant scope |
| POST | `/api/maintenance-requests/[id]/reject` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['maintenance_requests.reject'])` + department check but NO plant scope |
| POST | `/api/maintenance-requests/[id]/assign-planner` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['maintenance_requests.assign_planner'])` + supervisor check but NO plant scope |
| POST | `/api/maintenance-requests/[id]/comments` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['maintenance_requests.view'])` but NO plant scope. Any user with `view` can comment on any MR |
| POST | `/api/maintenance-requests/[id]/convert` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['maintenance_requests.convert_to_wo'])` but delegates to `convertMRToWorkOrder` service which also has NO plant scope |
| GET | `/api/maintenance-requests/pending-count` | ✅ | ✅ | ❌ | ❌ | **GAP**: Role-based count (admin/supervisor see all; planner sees approved; others see own). NO plant filter |

---

### Work Orders — Core CRUD

| Method | Route | Auth | Perm | Plant | denyAccess | Notes |
|--------|-------|:----:|:----:|:-----:|:----------:|-------|
| GET | `/api/work-orders` | ✅ | ✅ | ✅ | ⚠️ | `getPlantScope` → `applyPlantScope(where, plantScope)`. No explicit `denyAccess` 403 — uses sentinel filter (returns empty, not 403). `view_own` scoped to `assignedTo`/team |
| POST | `/api/work-orders` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `denyAccess` 403 → `canAccessPlant(body.plantId)`. Validates MR/asset/parts/tools/components plant alignment. User plant access check for assignees |
| GET | `/api/work-orders/[id]` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, wo.plantId)`. `view_own` → must be assignee/team/requester |
| PUT | `/api/work-orders/[id]` | ✅ | ✅ | ❌ | ❌ | **GAP**: `work_orders.update` permission only. No `getPlantScope` or `canAccessPlant`. `plantId` is in `allowedFields` (can be changed). Locked/verified/closed WOs are immutable |

---

### Work Orders — Workflow State Transitions (Plant-Scoped)

| Method | Route | Auth | Perm | Plant | denyAccess | Notes |
|--------|-------|:----:|:----:|:-----:|:----------:|-------|
| POST | `/api/work-orders/[id]/start` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, wo.plantId)`. `work_orders.update` or assignee/team. Sets `actualStart` |
| POST | `/api/work-orders/[id]/complete` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, wo.plantId)`. `work_orders.update` or assignee/team. Updates `actualEnd`, labor cost |
| POST | `/api/work-orders/[id]/handover` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, wo.plantId)`. Assignee/team can initiate handover |
| POST | `/api/work-orders/[id]/rework` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, wo.plantId)`. Supervisor/planner can trigger rework from `completed` |
| POST | `/api/work-orders/[id]/hold` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['work_orders.update'])` but NO plant scope. Any user with perm can hold any WO |
| POST | `/api/work-orders/[id]/resume` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['work_orders.update'])` but NO plant scope. Any user with perm can resume any WO |
| POST | `/api/work-orders/[id]/cancel` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['work_orders.update'])` but NO plant scope. Any user with perm can cancel any WO |
| POST | `/api/work-orders/[id]/approve` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['work_orders.update'])` but NO plant scope. Draft/requested → approved |
| POST | `/api/work-orders/[id]/close` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['work_orders.update'])` but NO plant scope. Verified → closed (planner closure) |
| POST | `/api/work-orders/[id]/verify` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['work_orders.update'])` but NO plant scope. Completed → verified (supervisor) |
| POST | `/api/work-orders/[id]/wait-parts` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['work_orders.update'])` but NO plant scope |
| POST | `/api/work-orders/[id]/request` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['work_orders.update'])` but NO plant scope. Draft → requested |
| POST | `/api/work-orders/[id]/assign` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['work_orders.update'])` but NO plant scope |
| POST | `/api/work-orders/[id]/plan` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission(['work_orders.update'])` but NO plant scope. Planner assigns resources |

---

### Work Orders — Sub-Resources (Plant-Scoped)

| Method | Route | Auth | Perm | Plant | denyAccess | Notes |
|--------|-------|:----:|:----:|:-----:|:----------:|-------|
| GET | `/api/work-orders/[id]/attachments` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, wo.plantId)` |
| POST | `/api/work-orders/[id]/attachments` | ✅ | ✅ | ✅ | ✅ | Same plant scope. Creates attachment record + audit log |
| GET | `/api/work-orders/[id]/capabilities` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, wo.plantId)`. Returns available actions |
| GET | `/api/work-orders/[id]/closed-pack` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, wo.plantId)`. Detailed closed WO data |
| GET | `/api/work-orders/[id]/measurements` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, wo.plantId)` |
| POST | `/api/work-orders/[id]/measurements` | ✅ | ✅ | ✅ | ✅ | Same plant scope. Creates measurement record |

---

### Work Orders — Sub-Resources (NO Plant Scope)

| Method | Route | Auth | Perm | Plant | denyAccess | Notes |
|--------|-------|:----:|:----:|:-----:|:----------:|-------|
| GET | `/api/work-orders/[id]/print` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope. Any user with perm can print any WO |
| POST | `/api/work-orders/[id]/comments` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `hasAnyPermission` but NO plant scope. Any user with perm can comment on any WO |
| GET | `/api/work-orders/[id]/status-history` | ✅ | ❌ | ❌ | ❌ | **GAP**: Session-only. No permission check, NO plant scope. Any authenticated user can view any WO's status history |
| GET | `/api/work-orders/[id]/transitions` | ✅ | ❌ | ❌ | ❌ | **GAP**: Session-only. No permission check, NO plant scope. Any authenticated user can query any WO's available transitions |
| GET/PUT | `/api/work-orders/[id]/components` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope |
| POST | `/api/work-orders/[id]/materials` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope. Creates material request on any WO |
| PUT/DELETE | `/api/work-orders/[id]/materials/[materialId]` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope |
| GET/POST/PUT | `/api/work-orders/[id]/personal-tools` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope. Personal tool management on any WO |
| GET/POST | `/api/work-orders/[id]/suggested-items` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope |
| GET/POST | `/api/work-orders/[id]/tasks` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope |
| PATCH | `/api/work-orders/[id]/tasks/[taskId]` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope |
| GET/POST | `/api/work-orders/[id]/team-member-requests` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope |
| PUT/DELETE | `/api/work-orders/[id]/team-member-requests/[reqId]` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope |
| POST | `/api/work-orders/[id]/team-members` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope. Can add team member to any WO |
| PUT/DELETE | `/api/work-orders/[id]/team-members/[memberId]` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope |
| GET/POST/DELETE | `/api/work-orders/[id]/time-logs` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope. Time log CRUD on any WO |

---

### Work Orders — Collection Endpoints

| Method | Route | Auth | Perm | Plant | denyAccess | Notes |
|--------|-------|:----:|:----:|:-----:|:----------:|-------|
| GET | `/api/work-orders/kpi` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `getPlantFilterWhere(plantScope)`. 13 parallel plant-filtered queries |
| GET | `/api/work-orders/planner-inbox` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant` + `applyPlantScope` |
| GET | `/api/work-orders/supervisor-inbox` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant` + `applyPlantScope` |
| GET | `/api/work-orders/reports` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `getPlantFilterWhere(plantScope)`. All report queries plant-filtered |
| GET | `/api/work-orders/active-enforcement` | ✅ | ❌ | N/A | N/A | User-scoped (`assignedTo: session.userId`). Only returns current user's in-progress WOs. No plant scope needed |
| GET | `/api/work-orders/active-session` | ✅ | ❌ | N/A | N/A | User-scoped. Returns current user's active time-tracking session. No plant scope needed |
| PUT | `/api/work-orders/bulk-update` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has `work_orders.update` permission but NO plant scope. Can bulk-update WOs across plants |
| GET | `/api/work-orders/pending-team-request-wo-ids` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has role check but NO plant scope. Returns WO IDs with pending team requests across all plants |

---

### Repair Material Requests

| Method | Route | Auth | Perm | Plant | denyAccess | Notes |
|--------|-------|:----:|:----:|:-----:|:----------:|-------|
| GET | `/api/repairs/material-requests` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → denyAccess 403 → `applyPlantScope(where, plantScope)`. `view_own` scoped to `requestedById` |
| POST | `/api/repairs/material-requests` | ✅ | ✅ | ⚠️ | ❌ | **Indirect**: No `getPlantScope` call. WO team membership enforced (user must be WO assignee or team member). WO is plant-scoped → indirect isolation |
| GET | `/api/repairs/material-requests/[id]` | ✅ | ⚠️ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, matReq.workOrder.plantId)`. Perm: session-only (any authenticated user in plant can view) |
| PUT | `/api/repairs/material-requests/[id]` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, existing.workOrder.plantId)`. Requester + admin/supervisor/manager roles |
| DELETE | `/api/repairs/material-requests/[id]` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, existing.workOrder.plantId)`. Only `pending` requests |
| POST (actions) | `/api/repairs/material-requests/[id]` | ✅ | ✅ | ✅ | ✅ | **Single plant scope check at handler top** (line ~197) covers ALL workflow actions: `supervisor_approve`, `supervisor_reject`, `storekeeper_approve`, `storekeeper_reject`, `issue`, `record_return`, `consume_material`, `waste_material`, `reconcile` |
| POST | `/api/repairs/material-requests/pick` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope. Pick list generation without plant validation |
| POST | `/api/repairs/material-requests/reconcile` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → denyAccess 403. Validates `consumed + wasted + returned == issued` invariant |
| GET | `/api/repairs/material-requests/reconciliation-report` | ✅ | ⚠️ | ✅ | ⚠️ | `getPlantScope` → `applyPlantScope`. No explicit denyAccess 403 (sentinel filter). Perm: session-only |

---

### Material Request POST Actions — Per-Action Authorization

All actions share a **single plant scope check** at the top of the handler (line ~197): `getPlantScope` → `canAccessPlant(plantScope, matReq.workOrder.plantId)`.

| Action | Authorized Roles | Additional Checks |
|--------|-----------------|------------------|
| `supervisor_approve` | `admin`, `maintenance_supervisor`, `maintenance_manager`, `plant_manager` | Status must be `pending`; optional quantity override; audit log |
| `supervisor_reject` | `admin`, `maintenance_supervisor`, `maintenance_manager`, `plant_manager` | Status must be `pending`; rejection reason; audit log |
| `storekeeper_approve` | `admin`, `store_keeper`, `inventory_manager`, `tools_shop_attendant` | Status must be `supervisor_approved`; stock reservation tx; audit log |
| `storekeeper_reject` | `admin`, `store_keeper`, `inventory_manager`, `tools_shop_attendant` | Status must be `supervisor_approved`; releases reserved stock; audit log |
| `issue` | `admin`, `store_keeper`, `inventory_manager`, `tools_shop_attendant` | Status must be `storekeeper_approved`/`picking`; inventory adjustment tx; audit log |
| `record_return` | `admin`, `store_keeper`, `inventory_manager` | Status must be `issued`/`partially_returned`; cumulative return; tx; audit log |
| `consume_material` | `admin` OR WO `assignedTo` | Status must be `issued`; floating-point tolerance; cumulative; audit log |
| `waste_material` | `admin` OR WO `assignedTo` | Status must be `issued`; floating-point tolerance; cumulative; audit log |
| `reconcile` | Any authenticated (plant-scoped) | Read-only: validates `consumed + wasted + returned == issued` |

---

### Repair Tool Requests

| Method | Route | Auth | Perm | Plant | denyAccess | Notes |
|--------|-------|:----:|:----:|:-----:|:----------:|-------|
| GET | `/api/repairs/tool-requests` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → denyAccess 403 → `applyPlantScope(where, plantScope)`. `view_own` scoped to `requestedById` |
| POST | `/api/repairs/tool-requests` | ✅ | ✅ | ⚠️ | ❌ | **Indirect**: No `getPlantScope`. WO team membership enforced. WO is plant-scoped → indirect isolation |
| GET | `/api/repairs/tool-requests/[id]` | ✅ | ⚠️ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, toolReq.plantId)`. Perm: session-only |
| POST (actions) | `/api/repairs/tool-requests/[id]` | ✅ | ✅ | ✅ | ✅ | **Single plant scope check at handler top** (line ~94) covers ALL workflow actions: `supervisor_approve`, `supervisor_reject`, `storekeeper_approve`, `storekeeper_reject`, `issue`, `return`, `storekeeper_confirm_return`, `storekeeper_reject_return` |
| PUT | `/api/repairs/tool-requests/[id]` | ✅ | ✅ | ❌ | ❌ | **GAP**: No `getPlantScope`. Mitigated: only `pending` status + ownership check. Requester was on WO team at creation |
| DELETE | `/api/repairs/tool-requests/[id]` | ✅ | ✅ | ❌ | ❌ | **GAP**: No `getPlantScope`. Mitigated: only `pending` status + ownership check. Releases reserved tool |

---

### Tool Request POST Actions — Per-Action Authorization

All actions share a **single plant scope check** at the top of the handler (line ~94): `getPlantScope` → `canAccessPlant(plantScope, toolReq.workOrder.plantId)`.

| Action | Authorized Roles | Additional Checks |
|--------|-----------------|------------------|
| `supervisor_approve` | `admin`, `maintenance_supervisor`, `maintenance_manager`, `plant_manager` | Status must be `pending`; multi-item quantity capping; availability warnings |
| `supervisor_reject` | `admin`, `maintenance_supervisor`, `maintenance_manager`, `plant_manager` | Status must be `pending`; stores rejection reason |
| `storekeeper_approve` | `admin`, `store_keeper`, `inventory_manager`, `tools_shop_attendant` | Status must be `supervisor_approved`; per-item stock check; tool reservation |
| `storekeeper_reject` | `admin`, `store_keeper`, `inventory_manager`, `tools_shop_attendant` | Status must be `supervisor_approved`; releases reserved tools |
| `issue` | `admin`, `store_keeper`, `inventory_manager`, `tools_shop_attendant` | Delegates to `atomicIssueTools` service; multi-item tx |
| `return` | Any authenticated (plant-scoped, issued request) | Status must be `issued`/`returned`; sets `pending_return` |
| `storekeeper_confirm_return` | `admin`, `store_keeper`, `inventory_manager`, `tools_shop_attendant` | Delegates to `atomicConfirmToolReturn` service; finalizes return |
| `storekeeper_reject_return` | `admin`, `store_keeper`, `inventory_manager`, `tools_shop_attendant` | Status must be `pending_return`; resets to `issued` |

---

### Repair Tool Transfers

| Method | Route | Auth | Perm | Plant | denyAccess | Notes |
|--------|-------|:----:|:----:|:-----:|:----------:|-------|
| GET | `/api/repairs/tool-transfers` | ✅ | ✅ | ✅ | ⚠️ | `getPlantScope` → `applyPlantScope`. No explicit denyAccess 403 (sentinel filter) |
| POST | `/api/repairs/tool-transfers` | ✅ | ✅ | ✅ | ⚠️ | `getPlantScope` → `applyPlantScope`. No explicit denyAccess 403 (sentinel filter). Cross-plant blocked via WO plant check |
| GET | `/api/repairs/tool-transfers/[id]` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, transfer.workOrder.plantId)` |
| POST | `/api/repairs/tool-transfers/[id]` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, transfer.workOrder.plantId)`. Accept/reject transfer |
| POST | `/api/repairs/tool-transfers/sync-quantities` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope. Syncs tool quantities without plant validation |

---

### Shift Handovers

| Method | Route | Auth | Perm | Plant | denyAccess | Notes |
|--------|-------|:----:|:----:|:-----:|:----------:|-------|
| GET | `/api/shift-handovers` | ✅ | ⚠️ | ✅ | ✅ | `getPlantScope` → denyAccess 403 → `applyPlantScope(where, plantScope)`. Perm: session-only |
| POST | `/api/shift-handovers` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → denyAccess 403. WO team membership check. Cross-plant handover explicitly blocked |
| GET | `/api/shift-handovers/[id]` | ✅ | ⚠️ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, handover.workOrder.plantId)`. Perm: session-only |
| PUT | `/api/shift-handovers/[id]` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, existing.workOrder.plantId)`. Only designated receiver can confirm |
| DELETE | `/api/shift-handovers/[id]` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, existing.workOrder.plantId)`. Admin-only operation |

---

### Other Repairs Routes — Downtime

| Method | Route | Auth | Perm | Plant | denyAccess | Notes |
|--------|-------|:----:|:----:|:-----:|:----------:|-------|
| GET | `/api/repairs/downtime` | ✅ | ✅ | ✅ | ⚠️ | `getPlantScope` → `applyPlantScope`. No explicit denyAccess 403 (sentinel filter) |
| POST | `/api/repairs/downtime` | ✅ | ✅ | ✅ | ⚠️ | `getPlantScope` → `applyPlantScope`. No explicit denyAccess 403 (sentinel filter) |
| GET | `/api/repairs/downtime/[id]` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, downtime.plantId)` |
| PUT | `/api/repairs/downtime/[id]` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, existing.plantId)` |
| DELETE | `/api/repairs/downtime/[id]` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `canAccessPlant(plantScope, existing.plantId)` |

---

### Other Repairs Routes — Reports & KPI

| Method | Route | Auth | Perm | Plant | denyAccess | Notes |
|--------|-------|:----:|:----:|:-----:|:----------:|-------|
| GET | `/api/repairs/kpi` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → `getPlantFilterWhere(plantScope)`. 13 parallel plant-filtered queries |
| GET | `/api/repairs/reports` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → effectivePlantId derivation. 6 report types |
| GET | `/api/repairs/reports/detailed` | ✅ | ❌ | ✅ | ✅ | `getPlantScope` → `getPlantFilterWhere(plantScope)`. Perm: session-only (any authenticated user) |
| POST | `/api/repairs/reports/xlsx` | ✅ | ✅ | ✅ | ✅ | `getPlantScope` → denyAccess 403 → `getPlantFilterWhere(plantScope)` |

---

### Other Repairs Routes — NO Plant Scope

| Method | Route | Auth | Perm | Plant | denyAccess | Notes |
|--------|-------|:----:|:----:|:-----:|:----------:|-------|
| GET/POST | `/api/repairs/completion/[workOrderId]` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope. WO completion data management without plant validation |
| GET/POST | `/api/repairs/damaged-tools` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope. Damaged tool reporting across all plants |
| GET/POST/PUT | `/api/repairs/damaged-tools/[id]` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope |
| POST | `/api/repairs/fix-comments` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope. Can add fix comments on any WO across plants |
| GET/POST | `/api/repairs/spare-part-returns` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope. Spare part returns without plant validation |
| GET/POST/PUT | `/api/repairs/spare-part-returns/[id]` | ✅ | ✅ | ❌ | ❌ | **GAP**: Has perm check but NO plant scope |

---

## Security Contract Tests (19 tests)

| # | Test | Status |
|---|------|--------|
| 1 | `canAccessPlant` returns false for inaccessible plant | ✅ PASS |
| 2 | `canAccessPlant` returns true for accessible plant | ✅ PASS |
| 3 | `canAccessPlant` returns true for system-wide (admin bypass) | ✅ PASS |
| 4 | `getPlantScope` returns `denyAccess` when user has no plants | ✅ PASS |
| 5 | `applyPlantScope` adds exact plant filter for single scoped plant | ✅ PASS |
| 6 | `applyPlantScope` adds plant IN filter for multi-plant | ✅ PASS |
| 7 | `applyPlantScope` adds ACCESS_DENIED sentinel for no plants | ✅ PASS |
| 8 | MR POST rejects cross-plant plantId | ✅ PASS |
| 9 | MR POST rejects cross-plant asset | ✅ PASS |
| 10 | WO POST rejects unauthorized plantId | ✅ PASS |
| 11 | WO POST rejects cross-plant maintenance request | ✅ PASS |
| 12 | WO POST rejects cross-plant asset | ✅ PASS |
| 13 | WO POST rejects cross-plant part | ✅ PASS |
| 14 | WO POST rejects cross-plant tool | ✅ PASS |
| 15 | WO POST rejects missing part ID | ✅ PASS |
| 16 | Material workflow POST blocks cross-plant access | ✅ PASS |
| 17 | Tool workflow POST blocks cross-plant access | ✅ PASS |
| 18 | Material readiness reconciliation invariant | ✅ PASS |
| 19 | Material cost formula `(consumed+wasted)*unitCost` | ✅ PASS |

---

## Gap Summary — Plant Scope Deficiencies

### Critical (User-Visible Cross-Plant Data Leak)

| # | Route(s) | Method | Impact | Mitigation |
|---|----------|--------|--------|------------|
| G1 | `work-orders/[id]/status-history` | GET | Any authenticated user can view ANY WO's full status transition history across plants | None — no perm check either |
| G2 | `work-orders/[id]/transitions` | GET | Any authenticated user can query available transitions for ANY WO across plants | None — no perm check either |
| G3 | `work-orders/[id]` | PUT | User with `work_orders.update` can modify any WO in any plant; `plantId` in `allowedFields` | Permission-gated (high-trust role); locked/verified/closed WOs immutable |

### High (Write Operations Without Plant Scope)

| # | Route(s) | Method | Impact | Mitigation |
|---|----------|--------|--------|------------|
| G4 | `work-orders/[id]/{hold,resume,cancel,approve,close,verify,wait-parts,request,assign,plan}` | POST | State transitions without plant check | Permission-gated (`work_orders.update`) but no plant boundary |
| G5 | `work-orders/[id]/comments` | POST | Can comment on any WO across plants | Permission-gated |
| G6 | `work-orders/[id]/materials` | POST | Can create material requests on any WO | Permission-gated |
| G7 | `work-orders/[id]/team-members` | POST | Can add team members to any WO | Permission-gated |
| G8 | `work-orders/[id]/time-logs` | GET/POST/DELETE | Can view/create/delete time logs on any WO | Permission-gated |
| G9 | `work-orders/bulk-update` | PUT | Can bulk-update WOs across plants | Permission-gated (`work_orders.update`) |
| G10 | `maintenance-requests/[id]/{approve,reject,assign-planner}` | POST | Can approve/reject/assign-planner for MRs in other plants | Department-based access control (weaker than plant scope) |
| G11 | `maintenance-requests/[id]/convert` | POST | Can convert MR to WO across plants | Delegates to service without plant scope |
| G12 | `repairs/damaged-tools` (list + [id]) | GET/POST/PUT | Damaged tool data visible/writable across plants | Permission-gated |
| G13 | `repairs/spare-part-returns` (list + [id]) | GET/POST/PUT | Spare part returns visible/writable across plants | Permission-gated |
| G14 | `repairs/completion/[workOrderId]` | GET/POST | WO completion data across plants | Permission-gated |

### Medium (Read-Only Without Plant Scope)

| # | Route(s) | Method | Impact | Mitigation |
|---|----------|--------|--------|------------|
| G15 | `work-orders/[id]/print` | GET | Can print any WO across plants | Permission-gated |
| G16 | `work-orders/[id]/components` | GET/PUT | Can view/update components on any WO | Permission-gated |
| G17 | `work-orders/[id]/suggested-items` | GET/PUT | Can view/update suggested items on any WO | Permission-gated |
| G18 | `work-orders/[id]/tasks` (list + [taskId]) | GET/POST/PATCH | Task data on any WO | Permission-gated |
| G19 | `work-orders/[id]/personal-tools` | GET/POST/PUT | Personal tools on any WO | Permission-gated |
| G20 | `work-orders/pending-team-request-wo-ids` | GET | WO IDs with pending team requests across plants | Role-gated |
| G21 | `maintenance-requests/[id]/comments` | POST | Can comment on any MR across plants | Permission-gated (`maintenance_requests.view`) |
| G22 | `maintenance-requests/pending-count` | GET | Count of pending MRs across all plants | Role-based scoping (admin/supervisor see all) |
| G23 | `repairs/fix-comments` | POST | Can add fix comments on any WO across plants | Permission-gated |
| G24 | `repairs/tool-transfers/sync-quantities` | POST | Syncs tool quantities without plant validation | Permission-gated |
| G25 | `repairs/material-requests/pick` | POST | Pick list generation without plant validation | Permission-gated |

---

## Quantitative Summary

| Metric | Count |
|--------|------:|
| **Total unique route handlers scanned** | **~120** |
| **With explicit plant scope** (getPlantScope + denyAccess/canAccessPlant/applyPlantScope) | **~67** |
| **With indirect plant scope** (WO team membership enforcement) | **2** |
| **With sentinel-only filter** (applyPlantScope, no explicit denyAccess 403) | **5** |
| **Without plant scope — GAP** | **~46** |
| **Without any permission check** (session-only) | **8** |
| **Without plant scope AND without permission check** | **2** |

### Plant Scope by Domain

| Domain | Total Handlers | With Plant Scope | Without | Coverage |
|--------|:--------------:|:-----------------:|:-------:|:--------:|
| Maintenance Requests | 11 | 5 | 6 | 45% |
| Work Orders (core CRUD) | 4 | 3 | 1 | 75% |
| Work Orders (workflow transitions) | 14 | 4 | 10 | 29% |
| Work Orders (sub-resources) | 22 | 6 | 16 | 27% |
| Work Orders (collection endpoints) | 8 | 4 | 2¹ | 50% |
| Repair Material Requests | 9 | 7 | 1² | 78% |
| Repair Tool Requests | 6 | 4 | 2 | 67% |
| Repair Tool Transfers | 5 | 4 | 1 | 80% |
| Shift Handovers | 5 | 5 | 0 | 100% |
| Repairs Downtime | 5 | 5 | 0 | 100% |
| Repairs Reports & KPI | 4 | 4 | 0 | 100% |
| Other Repairs (no plant scope) | 10 | 0 | 10 | 0% |

¹ active-enforcement and active-session are N/A (user-scoped)
² material-requests/pick is the only gap in material requests

---

## Quality Gate Results

| Gate | Status | Details |
|------|--------|---------|
| Prisma Validate | ✅ PASS | Schema valid |
| Vitest (19 security + 35 plant-scope) | ✅ PASS | 54/54 tests pass |
| ESLint | ✅ PASS | 0 errors, 34 warnings (unused-disable directives) |
| Ancestry | ✅ VERIFIED | `d4b89cbc` is ancestor of HEAD |
| Regression Patterns | ✅ CLEAN | No `resolvedPlantId = body.plantId \|\| primaryPlant` without `canAccessPlant` |

---

## Integration Summary

This branch is the **union** of:
1. **d4b89cbc** — 20-defect gate: plant-scope protections on all core CRUD API routes
2. **6a5480c0** — 15-defect corrections: workflow fixes, state-machine self-healing, reconciliation

All d4 plant-scope authorizations on core CRUD are preserved. All 6a corrections are applied.

### Key Finding
The **core CRUD handlers** (list/get/create/update/delete) for maintenance requests, work orders, material requests, tool requests, downtime, and shift handovers all have plant scope protection.

The primary gap area is **WO sub-resource and workflow transition routes** (~46 handlers). These routes have authentication and permission checks but lack explicit plant scope. In a multi-plant deployment, a user with the relevant permission (e.g., `work_orders.update`) can operate on WOs in plants they don't have access to.

### Risk Assessment
- **Shift handovers**: 100% plant-scoped — **no gaps**
- **Downtime**: 100% plant-scoped — **no gaps**
- **Reports & KPI**: 100% plant-scoped — **no gaps**
- **Material/Tool request workflow actions**: 100% plant-scoped (single check at handler top) — **no gaps**
- **MR core CRUD**: 100% plant-scoped — **no gaps** (workflow sub-routes have gaps)
- **WO core CRUD**: 75% plant-scoped (PUT is a gap)
- **WO workflow transitions**: 29% plant-scoped — **largest gap area**
- **WO sub-resources**: 27% plant-scoped — **second largest gap area**

No merge to main. Status: **REPAIRS/RWOP PILOT VALIDATION BLOCKED**.
