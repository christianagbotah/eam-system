# Task S7/S8 — Refactor WO Assign Route

## Agent: fullstack-developer

## Work Log

### Problem Analysis
Discovered 5 issues in the original `/src/app/api/work-orders/[id]/assign/route.ts`:
1. **Requires `assignedTo`** — Line 25-29 returned 400 if missing, blocking the supervisor delegation path (Path B)
2. **Team member creation NOT transactional** — Individual `db.workOrderTeamMember.create()` calls outside any transaction
3. **Audit log `oldValues` hardcoded** as `{ assignedTo: null }` — didn't capture actual old values
4. **No plant-scope check** — No verification that assignees have access to the WO's plant
5. **Team members got `accessLevel: 'read_only'`** — Blocked legitimate work

### Changes Made

#### 1. Two Assignment Paths
- **Path A — Direct Assignment** (`assignmentType: 'direct'`): Requires `assignedTo` OR `teamMembers`. If `teamMembers.length > 1`, must have exactly one `teamLeaderId`. If only one member, they default to team leader.
- **Path B — Supervisor Delegation** (`assignmentType: 'via_supervisor'`): Requires only `assignedSupervisorId`. `assignedTo` and `teamMembers` are optional/ignored. Status transitions to 'assigned'.
- **Backward compatibility**: Missing `assignmentType` defaults to `'direct'`.

#### 2. Validation Rules
- Direct: MUST have `assignedTo` OR `teamMembers` (at least one technician)
- If `teamMembers.length > 1`, MUST have `teamLeaderId` that is in the team
- If `teamMembers.length === 1`, `teamLeaderId` defaults to that member
- If `assignedTo` only (no teamMembers), they are both `assignedTo` and team leader
- Via supervisor: MUST have `assignedSupervisorId`

#### 3. Transaction
- Wrapped entire operation in `db.$transaction()`: state machine transition, team member upsert, and audit log are all atomic.
- `executeTransition` called with `tx` parameter so it uses the same transaction.

#### 4. Team Member Access Levels
- `team_leader` → `'full'`
- `assistant` / `specialist` → `'execution'` (NOT `'read_only'`)
- Used `upsert` instead of `create` to handle re-assignment gracefully.

#### 5. Plant Scope Check
- Before assignment, collected all user IDs (assignedTo, teamLeaderId, each team member, assignedSupervisorId)
- Batch-queried `userPlant` for the WO's plant
- If any user lacks access and caller is not admin → 403

#### 6. Audit Log
- Captures actual old values: `{ assignedTo, teamLeaderId, assignedSupervisorId, assignmentType }`
- New values only include fields that changed

#### 7. Notifications
- All `notifyUser()` calls are fire-and-forget (`.catch(() => {})`)
- Added supervisor notification for both direct (with supervisor) and via_supervisor paths

### File Changed
- `/src/app/api/work-orders/[id]/assign/route.ts` — Complete rewrite

### Lint Status
- No lint errors from this file (verified with `bun run lint`)

### Backward Compatibility
- Old callers sending `assignedTo` without `assignmentType` still work (treated as 'direct')
- URL and HTTP method unchanged
- Permission check (`work_orders.assign_supervisor`) preserved

### Stage Summary
- All 5 identified problems resolved
- Two clean assignment paths with proper validation
- Fully transactional operations
- Plant-scope access control
- Correct team member access levels
- Accurate audit logging