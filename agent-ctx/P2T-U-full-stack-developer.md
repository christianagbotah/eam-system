# P2T-U — Supervisor & Planner Inbox APIs

## Task IDs
- P2T: Supervisor Inbox API
- P2U: Planner Closeout Inbox API

## Summary

### Files Created
1. **`src/app/api/work-orders/supervisor-inbox/route.ts`** — GET endpoint returning 7-category supervisor work queue
2. **`src/app/api/work-orders/planner-inbox/route.ts`** — GET endpoint returning 6-category planner closeout queue

### Schema Decisions
- **WorkOrder.repairCompletion** relation exists → used directly for rework jobs filter (`repairCompletion: { reworkCount: { gt: 0 } }`)
- **WorkOrder has no `completedAt`** → planner repeat failures query uses `updatedAt` as proxy
- **WoTeamMemberRequest lacks `plantId`** → filters via nested `workOrder` relation using `getPlantFilterWhere()`
- **RepairToolRequest / RepairMaterialRequest** both have `plantId` → direct `applyPlantScope()` works

### Supervisor Inbox Categories (7)
| Key | Query |
|-----|-------|
| `awaitingVerification` | WOs with status='completed' |
| `reworkJobs` | WOs in_progress with repairCompletion.reworkCount > 0 |
| `pendingAssistance` | WoTeamMemberRequests with status='pending' |
| `pendingToolApprovals` | RepairToolRequests with status='pending' |
| `pendingMaterialApprovals` | RepairMaterialRequests with status='pending' |
| `slaRisks` | WOs past plannedEnd, not terminal status |
| `criticalActive` | WOs in_progress with priority in [critical, urgent] |

### Planner Inbox Categories (6)
| Key | Query |
|-----|-------|
| `awaitingCloseout` | WOs with status='verified' |
| `awaitingSupervisor` | WOs with status='completed' |
| `highCostJobs` | WOs totalCost > $5,000, not closed/cancelled |
| `repeatFailures` | Assets with 3+ recent WOs (90 days) |
| `resourceDelays` | WOs in waiting_parts/tools/shutdown/permit |
| `overdue` | WOs past plannedEnd, not terminal |

### Permissions
- Supervisor: `work_orders.view | work_orders.view_all | work_orders.assign_supervisor | admin`
- Planner: `work_orders.view | work_orders.view_all | admin`

### ESLint
Both files pass with zero errors/warnings.
