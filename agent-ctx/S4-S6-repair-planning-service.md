# Task S4+S6: Repair Planning Domain Service

**File created:** `src/services/repairPlanning.service.ts`

## Summary

Extracted ALL business logic from the MR→WO convert API route (`src/app/api/maintenance-requests/[id]/convert/route.ts`) into a single, pure-domain async function: `convertMRToWorkOrder()`.

## What was implemented

### Single exported function
```ts
export async function convertMRToWorkOrder(mrId, payload, session): Promise<ConvertMRToWOResult>
```

### Exported types
- `SessionLike` — minimal session (userId, fullName?, roles[])
- `ConvertMRToWOPayload` — all conversion parameters from the frontend
- `ConvertMRToWOResult` — success/failure, workOrder, error, conflictWoNumber, notifications[]
- `ConversionNotification` — notification payload for post-tx dispatch

### Transaction scope (single `db.$transaction()`)
1. **Idempotency** — forward link check (`mr.workOrderId` → WO exists?) + reverse lookup (`WO.maintenanceRequestId`)
2. **Plant scope** — `userPlant.findUnique` check (bypassed for admin)
3. **Stale link cleanup** — clear `mr.workOrderId` if pointing to a deleted WO
4. **WO number generation** — inside tx, P2002 retry up to 3 attempts
5. **WO creation** — with correct field mapping and priority preservation from MR
6. **Team members** — `accessLevel: 'full'` for team_leader, `'execution'` for others (NOT `'read_only'`)
7. **Parts** → `WorkOrderMaterial` with `status: 'planned'` (NOT `'requested'`)
8. **Tools** → `RepairToolRequest` (source: `'planner_suggested'`, status: `'pending'`) + `RepairToolRequestItem`
9. **State machine** — `executeTransition('maintenance_request', mrId, 'converted', session, { extraData, tx })`
10. **Audit log** — `tx.auditLog.create()`
11. **Notifications** — returned as payloads (not sent inside tx)

### Key differences from the original route
| Aspect | Original Route | New Service |
|--------|---------------|-------------|
| Tool records | `WorkOrderMaterial` (wrong model) | `RepairToolRequest` + `RepairToolRequestItem` (correct) |
| Parts status | `'requested'` | `'planned'` |
| Team access | `'read_only'` for non-leaders | `'execution'` for non-leaders |
| Title default | `'WO for ${mr.title}'` | `mr.title` (cleaner) |
| WO number gen | Before tx (race-prone) | Inside tx with P2002 retry |
| State machine | After tx (separate) | Inside tx via `tx` option |
| Notifications | Sent via `notifyUser()` | Returned as payload array |
| HTTP awareness | NextRequest/NextResponse | None (pure domain) |

## Lint
ESLint passes cleanly with zero errors.
