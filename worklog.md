# EAM System Worklog

---
Task ID: 1
Agent: main
Task: Fix dashboard showing all zeros + VPS OOM build failure

Work Log:
- Analyzed dashboard stats API (`src/app/api/dashboard/stats/route.ts`) — found that ALL 40+ queries run in a single Promise.all, and if ANY query fails (e.g., missing table like `iot_devices`, `non_conformance_reports`, `quality_audits`), the entire response fails with 500
- Analyzed dashboard frontend (`src/components/modules/DashboardPages.tsx`) — found that API errors are silently swallowed and stats stay `null`, causing all `|| 0` fallbacks to show zeros
- Root cause: The VPS build kept failing with OOM kill (exit code 137), so the fix from previous session (commit c79d3e3d) was never deployed
- Fixed dashboard stats API: Added `safe()` helper that wraps each query with `.catch()` and returns fallback values (0 for counts, [] for arrays). Now one failing query doesn't kill the entire response. Also added console.warn logging for failed queries.
- Fixed dashboard frontend: Added `error` state, replaced silent error handling with visible error banner + retry button. Now shows "Unable to Load Dashboard" with error details instead of misleading all-zeros view.
- Created VPS deployment script (`scripts/deploy-vps.sh`) with: automatic swap setup (2GB), Node.js memory limiting (`--max-old-space-size=1024`), build monitoring, OOM detection with helpful error messages
- Updated `scripts/vm-deploy.sh` with same memory protections
- Verified notification popover is correctly implemented: badge count, pending requests banner, click-to-navigate, mark-all-read all work correctly
- Verified Notification type has all required fields (id, type, title, message, actionUrl, isRead, createdAt)
- Verified `mr-detail` and `wo-detail` are valid PageNames in navigation system

Stage Summary:
- **Dashboard API fix**: `src/app/api/dashboard/stats/route.ts` — each query wrapped with `safe()` for resilience
- **Dashboard UI fix**: `src/components/modules/DashboardPages.tsx` — error state with retry instead of silent zeros
- **Deploy script**: `scripts/deploy-vps.sh` — handles OOM with swap + memory limits
- **Updated**: `scripts/vm-deploy.sh` — same memory protections
- **Key insight**: The VPS OOM build failure (exit 137) was blocking ALL previous fixes from being deployed. User needs to run `bash scripts/deploy-vps.sh --swap` first, then `bash scripts/deploy-vps.sh`

---
Task ID: 2
Agent: main
Task: Fix 400 Bad Request on approve maintenance request

Work Log:
- Investigated the approve endpoint at `src/app/api/maintenance-requests/[id]/approve/route.ts`
- The 400 comes from `executeTransition` in `src/lib/state-machine.ts` — it queries the `status_transitions` table for a matching rule
- Most likely root cause: `status_transitions` table is empty on VPS (seed was never run), OR user role mismatch
- Added diagnostic logging to state machine: logs missing transition rules and role mismatches with actionable hints
- Added `debug` field to the 400 response body on the approve endpoint (includes mrStatus, userRoles, userId)
- Improved error messages: now includes hints like "Run: bun run prisma/seed.ts" when transition rules are missing
- Created diagnostic API endpoint at `/api/diagnostics/status-transitions` — can be curl'd without auth to check if transitions are seeded
- Created transition auto-seed script at `scripts/seed-transitions.ts` — inserts missing MR/WO transitions without touching other data

Stage Summary:
- **Approve route**: Now returns `debug` field in 400 response with diagnostic info
- **State machine**: Improved error messages with actionable hints (seed instructions, required roles)
- **Diagnostic endpoint**: `GET /api/diagnostics/status-transitions` — checks if transitions exist, reports missing ones
- **Seed script**: `scripts/seed-transitions.ts` — targeted re-seed of only status_transitions table
- **VPS fix**: After deploying, user should curl the diagnostic endpoint and/or run the seed script

---
Task ID: 3
Agent: main
Task: Comprehensive VPS knowledge base + fix searchText runtime error

Work Log:
- Rewrote `docs/VPS-DEPLOYMENT-GUIDE.md` into a comprehensive knowledge base with 12 sections:
  - Panic Checklist (what to do first when site is down)
  - All 15 errors documented chronologically with symptoms, root causes, and fixes
  - Complete deployment procedures (quick + manual step-by-step)
  - Prisma standalone full story (why cp -r fails, why symlinks work)
  - Status transitions seeding guide with role/transition tables
  - Database column name reference (camelCase, not snake_case)
  - Troubleshooting quick reference tables
  - Diagnostic commands cheat sheet
  - 12 common mistakes to avoid
- Fixed `searchText is not defined` runtime error in `WorkerAssignmentSelector.tsx`:
  - Root cause: `MobileWorkerList` component referenced `searchText` and `hideDepartmentFilter` but they were not passed as props
  - Fix: Added `searchText: string` and `hideDepartmentFilter?: boolean` to MobileWorkerList props and passed them from parent

Stage Summary:
- **Knowledge base**: `docs/VPS-DEPLOYMENT-GUIDE.md` — complete rewrite with 15 documented errors, panic checklist, diagnostic commands
- **Bug fix**: `src/components/shared/WorkerAssignmentSelector.tsx` — passed `searchText` and `hideDepartmentFilter` as props to `MobileWorkerList`
- **Pending**: User still needs to run `seed-transitions.js` on VPS to fix approve 400 error
---

Task ID: 4
Agent: main
Task: Unify WO edit form with create form + restrict tool/material approval roles

Work Log:
- Rewrote WO edit dialog in `MaintenancePages.tsx` to match the CreateWOForm structure with 4 sections:
  - Request Information (blue bg) — only shown if WO was converted from MR (`wo.maintenanceRequest`)
  - Work Order Details (purple bg) — type, priority, trade activity, est hours, technical description, scheduled/delivery dates
  - Resource Assignment (green bg) — WorkerAssignmentSelector, spare parts, tools
  - Safety Notes (amber bg) — safety notes, PPE required, general notes
- Mobile version uses MobileStepperSheet with 3 steps + optional request info header
- Updated `openEditWO()` to populate all new fields from WO data (tradeActivity, safetyNotes, ppeRequired, notes, etc.)
- Updated `handleEditWO()` to send complete payload matching create form
- Added `tradeActivity`, `technicalDescription`, `safetyNotes`, `ppeRequired`, `assignedTo`, `teamLeaderId` to WO PUT API `allowedFields`
- Fixed tool request approval: restricted to admin, store_keeper, store_manager only (removed maintenance_supervisor, maintenance_manager, plant_manager)
- Fixed material request approval: same restriction — admin, store_keeper, store_manager only

Stage Summary:
- **WO Edit Form**: Now matches CreateWOForm with 4 colored sections, mobile stepper, and conditional MR info
- **WO PUT API**: Added tradeActivity, technicalDescription, safetyNotes, ppeRequired, assignedTo, teamLeaderId to allowedFields
- **Tool Approval**: `src/app/api/repairs/tool-requests/[id]/route.ts` — restricted to admin, store_keeper, store_manager
- **Material Approval**: `src/app/api/repairs/material-requests/[id]/route.ts` — restricted to admin, store_keeper, store_manager

---
Task ID: 5
Agent: main
Task: Fix WO edit form backend gaps + approval role frontend/backend mismatch

Work Log:
- Found 6 fields sent by handleEditWO() but silently dropped by WO PUT API (not in allowedFields)
- Added `deliveryDateRequired`, `assignmentType`, `assignedSupervisorId` to WO PUT `allowedFields`
- Added relational field handling in WO PUT API: teamMembers (delete+recreate), requiredParts (delete+recreate), requiredTools (delete+recreate)
- Fixed frontend/backend role mismatch: `isSupervisorOrAdmin()` in RepairsPages.tsx was allowing maintenance_supervisor, maintenance_manager, plant_manager to see approve buttons, but backend only allows admin, store_keeper, store_manager → updated to match
- Fixed `requiredTools` always empty in `openEditWO()`: now populated by matching WO material names (non-itemId materials) against loaded tool data
- Resolved merge conflicts during git rebase (ExplodedView.tsx, useDigitalTwinScene.ts, worklog.md)

Stage Summary:
- **WO PUT API** (`src/app/api/work-orders/[id]/route.ts`): Now handles scalar fields + relational updates (team members, parts, tools)
- **Approval roles** (`src/components/modules/RepairsPages.tsx`): `isSupervisorOrAdmin()` now matches backend — admin, store_keeper, store_manager only
- **requiredTools**: Populated from existing WO materials in edit dialog

