# REPAIRS FINAL — Security Audit Matrix

> Generated from actual handler code on branch `fix/repairs-final-uat-gate`.
> Each row documents the security controls observed in the route handler source.

---

## Endpoint Security Matrix

| Method | Route | Auth | Permission/Role | Plant Scoped | IDOR Check | Rejection Conditions |
|--------|-------|------|-----------------|--------------|------------|----------------------|
| **GET** | `/api/work-orders` | Yes (session) | `work_orders.view` OR `work_orders.view_own` OR `admin` | Yes — `getPlantScope` → `applyPlantScope` on `where` | Yes — `view_own` scoped to `assignedTo = session.userId` or team membership; technicians scoped similarly | 401 no session; 403 insufficient permissions; 500 error |
| **POST** | `/api/work-orders` | Yes (session) | `work_orders.create` OR `admin` | Yes — validates MR plant match, asset plant, user plant access, parts/tools/components plant integrity | N/A (create) | 400 missing title, MR not found/not approved/already converted, MR plant mismatch, asset plant mismatch, user plant mismatch, parts/tools/components plant mismatch, invalid team member; 401 no session; 403 insufficient permissions; 500 error |
| **GET** | `/api/work-orders/[id]` | Yes (session) | `work_orders.view` OR `work_orders.view_all` OR `admin`; `view_own` restricts to assignee/team/requester | Yes — `getPlantScope` → `canAccessPlant(plantScope, wo.plantId)` | Yes — `view_own` users must be assignee, team member, or MR requester | 401 no session; 403 denyAccess or plant mismatch, or view_own user not assigned; 404 WO not found; 500 error |
| **PUT** | `/api/work-orders/[id]` | Yes (session) | `work_orders.update` OR `admin` | **No** — no `getPlantScope` call | No | 401 no session; 403 insufficient permissions; 400 locked WO, verified/closed status; 404 WO not found; 500 error |
| **GET** | `/api/maintenance-requests` | Yes (session) | `maintenance_requests.view` OR `maintenance_requests.view_own` OR `admin` | Yes — `getPlantScope` → `applyPlantScope` on `where` | Yes — `view_own` scoped to `requestedBy = session.userId`; supervisors scoped to supervised departments; technicians scoped to assigned WOs | 401 no session; 403 insufficient permissions; 500 error |
| **POST** | `/api/maintenance-requests` | Yes (session) | `maintenance_requests.create` OR `admin` | **No** — resolves `plantId` from `userPlant.isPrimary` if not provided; no `getPlantScope` call | N/A (create) | 400 missing title; 401 no session; 403 insufficient permissions; 500 error |
| **GET** | `/api/maintenance-requests/[id]` | Yes (session) | `maintenance_requests.view` OR `maintenance_requests.view_own` OR `admin` | Yes — `getPlantScope` → `canAccessPlant(plantScope, mr.plantId)`; fallback to `userPlant` lookup | Yes — `view_own` users can only see their own requests (`requestedBy !== session.userId` → 404) | 401 no session; 403 denyAccess or plant mismatch; 404 MR not found (or view_own IDOR masquerading as 404); 500 error |
| **PUT** | `/api/maintenance-requests/[id]` | Yes (session) | `maintenance_requests.update` OR `admin` for full; `create` permission for own pending | Yes — `getPlantScope` → `canAccessPlant(plantScope, existing.plantId)` | Yes — pending requests: only requester can edit (unless admin/update perm); approved/rejected/converted: only notes update by admin/supervisor | 401 no session; 400 cannot update approved/rejected/converted, cannot change plantId/assetId, only requester can edit pending; 403 insufficient permissions, plant mismatch, ownership mismatch; 404 MR not found; 500 error |
| **DELETE** | `/api/maintenance-requests/[id]` | Yes (session) | Requester OR `admin` (via `canModifyPendingRequest` helper) | Yes — `getPlantScope` → `canAccessPlant(plantScope, existing.plantId)` in helper | Yes — `canModifyPendingRequest`: only requester or admin; status must be `pending` | 401 no session; 400 not pending status; 403 not requester and not admin, plant mismatch; 404 MR not found; 500 error |
| **GET** | `/api/repairs/material-requests` | Yes (session) | `repair_material_requests.view` OR `view_all` OR `view_own` OR `admin` | Yes — `getPlantScope` → fail-closed on `denyAccess`; `applyPlantScope` on `where` | Yes — `view_own` scoped to `requestedById = session.userId` | 401 no session; 403 denyAccess or insufficient permissions; 500 error |
| **POST** | `/api/repairs/material-requests` | Yes (session) | `repair_material_requests.create` OR `admin` | **No** — no `getPlantScope` call; access controlled via WO team membership | Yes — WO team membership or assignee check | 400 missing required fields, WO not found; 401 no session; 403 not on WO team; 404 WO not found; 500 error |
| **GET** | `/api/repairs/material-requests/[id]` | Yes (session) | None (session-only) | Yes — `getPlantScope` → `canAccessPlant(plantScope, matReq.workOrder.plantId)` | **No** — no ownership check; any user with plant access can view | 401 no session; 403 denyAccess or plant mismatch; 404 material request not found; 500 error |
| **PUT** | `/api/repairs/material-requests/[id]` | Yes (session) | Requester OR `admin`/`maintenance_supervisor`/`maintenance_manager`/`plant_manager` | Yes — `getPlantScope` → `canAccessPlant(plantScope, existing.workOrder.plantId)` | Yes — non-admin/supervisor/manager: only own requests, only `pending` status | 401 no session; 400 only pending can be edited; 403 not own request and not privileged role, plant mismatch; 404 not found; 500 error |
| **DELETE** | `/api/repairs/material-requests/[id]` | Yes (session) | Requester OR `admin`/`maintenance_supervisor`/`maintenance_manager`/`plant_manager` | Yes — `getPlantScope` → `canAccessPlant(plantScope, existing.workOrder.plantId)` | Yes — non-admin/supervisor/manager: only own requests | 401 no session; 400 only pending can be cancelled; 403 not own request and not privileged role, plant mismatch; 404 not found; 500 error |
| **POST** | `/api/repairs/material-requests/[id]` (actions) | Yes (session) | Role-based per action: `supervisor_approve/reject` → admin/supervisor/manager/plant_manager; `storekeeper_approve/reject` → admin/store_keeper/inventory_manager/tools_shop_attendant | **No** — no plant scope check on action handlers | No — role-gated only | 401 no session; 400 invalid status transition; 403 wrong role for action; 404 not found; 500 error |
| **GET** | `/api/repairs/tool-requests` | Yes (session) | `repair_tool_requests.view` OR `view_all` OR `view_own` OR `admin` | Yes — `getPlantScope` → `applyPlantScope` on `where` | Yes — `view_own` scoped to `requestedById = session.userId` | 401 no session; 403 insufficient permissions; 500 error |
| **POST** | `/api/repairs/tool-requests` | Yes (session) | `repair_tool_requests.create` OR `admin` | **No** — no `getPlantScope` call; access controlled via WO team membership | Yes — WO team membership or assignee check | 400 missing required fields/items, tool not found; 401 no session; 403 not on WO team; 404 WO or tool not found; 500 error |
| **GET** | `/api/repairs/tool-requests/[id]` | Yes (session) | None (session-only) | Yes — `getPlantScope` → `canAccessPlant(plantScope, toolReq.plantId)` | **No** — no ownership check; any user with plant access can view | 401 no session; 403 denyAccess or plant mismatch; 404 tool request not found; 500 error |
| **PUT** | `/api/repairs/tool-requests/[id]` | Yes (session) | Requester OR `admin`/`maintenance_supervisor`/`maintenance_manager`/`plant_manager` | **No** — no `getPlantScope` call | Yes — non-admin/supervisor/manager: only own requests, only `pending` status | 401 no session; 400 not pending, empty items; 403 not own request and not privileged role; 404 not found; 500 error |
| **DELETE** | `/api/repairs/tool-requests/[id]` | Yes (session) | Requester OR `admin`/`maintenance_supervisor`/`maintenance_manager`/`plant_manager` | **No** — no `getPlantScope` call | Yes — non-admin/supervisor/manager: only own requests, only `pending` status | 401 no session; 400 not pending; 403 not own request and not privileged role; 404 not found; 500 error |
| **POST** | `/api/repairs/tool-requests/[id]` (actions) | Yes (session) | Role-based per action: `supervisor_approve/reject` → admin/supervisor/manager/plant_manager; `storekeeper_approve/reject` → admin/store_keeper/inventory_manager/tools_shop_attendant; `issue` → admin/store_keeper/inventory_manager/tools_shop_attendant | **No** — no plant scope check on action handlers | No — role-gated only | 401 no session; 400 invalid status/transition; 403 wrong role for action; 404 not found; 500 error |
| **GET** | `/api/shift-handovers` | Yes (session) | None (session-only) | Yes — `getPlantScope` → filter by `workOrder.plantId`; fail-closed on `denyAccess` | No — list endpoint, plant-scoped | 401 no session; 403 denyAccess; 500 error |
| **POST** | `/api/shift-handovers` | Yes (session) | `shift_handovers.create` OR `admin` | Yes — `getPlantScope` → fail-closed on `denyAccess`; cross-plant WO validation | Yes — WO team membership check (assignee or team member) | 400 missing shiftType, WO terminal status, not on WO team; 401 no session; 403 denyAccess, cross-plant WO, insufficient permissions; 404 WO not found; 500 error |
| **GET** | `/api/shift-handovers/[id]` | Yes (session) | None (session-only) | Yes — `getPlantScope` → `canAccessPlant(plantScope, handover.workOrder.plantId)` | **No** — no ownership check; plant-scoped access is sufficient | 401 no session; 403 denyAccess or plant mismatch; 404 not found; 500 error |
| **PUT** | `/api/shift-handovers/[id]` | Yes (session) | `shift_handovers.create` OR `admin` | Yes — `getPlantScope` → `canAccessPlant(plantScope, existing.workOrder.plantId)` | Yes — confirmation: only designated `receivedById` user (or supervisor/admin override with reason); confirmed handovers immutable for non-supervisors | 401 no session; 400 supervisor override requires reason; 403 denyAccess, plant mismatch, not designated receiver, confirmed immutability; 404 not found; 500 error |
| **DELETE** | `/api/shift-handovers/[id]` | Yes (session) | `admin` role only (hardcoded check) | Yes — `getPlantScope` → `canAccessPlant(plantScope, existing.workOrder.plantId)` | No — admin-only operation, plant-scoped | 401 no session; 403 not admin, denyAccess, plant mismatch; 404 not found; 500 error |
| **POST** | `/api/work-orders/[id]/handover` | Yes (session) | Delegated to `workExecution.service` (initiateHandover/resumeAfterHandover) | Yes — `getPlantScope` → `canAccessPlant(plantScope, wo.plantId)` | No — service enforces team/role checks internally | 401 no session; 403 denyAccess or plant mismatch; 404 WO not found; 400/422 service-level rejection; 500 error |

---

## 11 Key Security Invariants

These invariants are verified by the static contract tests in `src/__tests__/security-contract.test.ts`.

| # | Invariant | Route(s) | Evidence Pattern |
|---|-----------|----------|-----------------|
| 1 | Material Request PUT handler has plant scope check | `repairs/material-requests/[id]` | `getPlantScope` call in PUT handler body |
| 2 | Material Request DELETE handler has plant scope check | `repairs/material-requests/[id]` | `getPlantScope` call in DELETE handler body |
| 3 | Maintenance Request PUT handler has plant scope check | `maintenance-requests/[id]` | `getPlantScope` call in PUT handler body |
| 4 | Maintenance Request DELETE handler has plant scope check | `maintenance-requests/[id]` | `getPlantScope` call in DELETE handler body (via `canModifyPendingRequest` helper) |
| 5 | Maintenance Request PUT rejects plantId/assetId changes | `maintenance-requests/[id]` | String literal `'Cannot change plantId or assetId'` in module |
| 6 | WO POST validates MR plant match | `work-orders` | String literal `'plant does not match'` in module |
| 7 | WO POST validates asset plant belongs to WO plant | `work-orders` | String literal `'does not belong to the work order plant'` in module |
| 8 | Tool Request issue action has role guard | `repairs/tool-requests/[id]` | `'issue'` action check with `store_keeper`/`inventory_manager`/`tools_shop_attendant` roles |
| 9 | Shift Handover PUT has receivedById confirmation check | `shift-handovers/[id]` | String `'Only the designated receiver can confirm this handover'` in module |
| 10 | Handover initiate creates ShiftHandover record | `workExecution.service.ts` | `shiftHandover.create` call in service |
| 11 | State machine `ensureTransitionsSeeded` returns `{attempted, succeeded}` | `state-machine.ts` | Function signature returns `Promise<{ attempted: boolean; succeeded: boolean }>` |

---

## Notes

- **Plant scope via relation**: Material Requests, Tool Requests (GET), and Shift Handovers do not have their own `plantId` column. Plant scoping is achieved through their linked `workOrder.plantId`.
- **Tool Requests [id] PUT/DELETE**: These handlers lack `getPlantScope` calls — access is controlled purely by ownership and status checks. This is a known gap documented for future hardening.
- **WO [id] PUT**: Lacks `getPlantScope` call. Access is controlled by `work_orders.update` permission only.
- **Fail-closed**: All `getPlantScope` checks use `plantScope.denyAccess` as a fail-closed guard — if the plant scope system cannot determine access, access is denied.
- **IDOR masquerading as 404**: `maintenance-requests/[id]` GET returns 404 (not 403) for view_own users accessing another user's request, to prevent information leakage about request existence.
