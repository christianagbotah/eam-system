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

---
Task ID: 3f
Agent: main
Task: Replace remaining native date inputs with DatePicker component in MaintenancePages.tsx

Work Log:
- Verified import of DatePicker already exists at line 57
- Replaced 4 native `<Input type="date">` inputs with `<DatePicker>` component:
  1. **PM Schedule form (line ~4589)**: "Next Due Date" — removed `<div className="space-y-2">` + `<Label>` wrapper, replaced with `<DatePicker label="Next Due Date">` using `formNextDueDate`/`setFormNextDueDate` state
  2. **Calibration form "Last Calibration" (line ~5319)**: removed `<div className="grid gap-2">` + `<Label>` wrapper, replaced with `<DatePicker label="Last Calibration">` using `form.lastCalibration`
  3. **Calibration form "Next Due" (line ~5320)**: removed `<div className="grid gap-2">` + `<Label>` wrapper, replaced with `<DatePicker label="Next Due">` using `form.nextDue`
  4. **Risk Assessment edit form (line ~5617)**: removed `<div>` + `<Label>` wrapper, replaced with `<DatePicker label="Assessment Date">` using `editForm.assessmentDate`
- Confirmed no remaining `<Input type="date">` in the file
- Did not touch any already-converted forms (WO Create/Edit, Convert MR to WO)

Stage Summary:
- **File**: `src/components/modules/MaintenancePages.tsx`
- **Lines changed**: ~4589 (PM Schedule), ~5316 (Calibration - Last Calibration), ~5317 (Calibration - Next Due), ~5614 (Risk Assessment)
- **Pattern**: Removed wrapper div + Label, passed label as prop to DatePicker, converted `undefined` ↔ `''` between component and state
- **Import**: Already existed at line 57 — no duplicate added

---
Task ID: 3a
Agent: main
Task: Refactor date/time inputs in SafetyPages.tsx to use DatePicker component

Work Log:
- Read `src/components/modules/SafetyPages.tsx` to identify all 14 `<Input type="date">` instances across 5 safety page components
- Added import: `import { DatePicker } from '@/components/ui/datetime-picker'` at line 40
- Fixed duplicate DatePicker import that was already present (consolidated to single import)
- Replaced all 14 native date inputs with `<DatePicker>` component:

  **SafetyIncidentsPage** (create form):
  1. Line ~176: "Date" — `form.date`, simple `e.target.value` pattern → `v || ''`

  **SafetyInspectionsPage** (create form):
  2. Line ~432: "Scheduled Date" — `form.scheduledDate`, simple `e.target.value` pattern → `v || ''`

  **SafetyInspectionsPage** (edit form):
  3. Line ~553: "Scheduled Date" — `editForm.scheduledDate` with `.slice(0, 10)` and `|| null`
  4. Line ~554: "Completed Date" — `editForm.completedDate` with `.slice(0, 10)` and `|| null`

  **SafetyTrainingPage** (create form):
  5. Line ~676: "Scheduled Date" — `form.scheduledDate`, simple `e.target.value` pattern → `v || ''`

  **SafetyTrainingPage** (edit form):
  6. Line ~776: "Scheduled Date" — `editForm.scheduledDate` with `.slice(0, 10)` and `|| null`
  7. Line ~777: "Completed Date" — `editForm.completedDate` with `.slice(0, 10)` and `|| null`

  **SafetyEquipmentPage** (create form):
  8. Line ~913: "Last Inspection" — `form.lastInspection`, simple `e.target.value` pattern → `v || ''`
  9. Line ~914: "Next Inspection" — `form.nextInspection`, simple `e.target.value` pattern → `v || ''`

  **SafetyEquipmentPage** (edit form):
  10. Line ~1007: "Last Inspected" — `editForm.lastInspected` with `.slice(0, 10)` and `|| null`
  11. Line ~1008: "Next Inspection" — `editForm.nextInspection` with `.slice(0, 10)` and `|| null`

  **SafetyPermitsPage** (create form):
  12. Line ~1131: "Valid From" — `form.validFrom`, simple `e.target.value` pattern → `v || ''`
  13. Line ~1132: "Valid Until" — `form.validUntil`, simple `e.target.value` pattern → `v || ''`

  **SafetyPermitsPage** (edit form):
  14. Line ~1243: "Start Date" — `editForm.startDate` with `.slice(0, 10)` and `|| null`
  15. Line ~1244: "End Date" — `editForm.endDate` with `.slice(0, 10)` and `|| null`

- Pattern used:
  - Create forms: `value={form.field || undefined}` with `onChange={v => setForm(p => ({ ...p, field: v || '' }))}`
  - Edit forms with `.slice(0, 10)`: `value={editForm.field ? String(editForm.field).slice(0, 10) : undefined}` with `onChange={v => setEditForm(p => ({ ...p, field: v || null }))}`
  - Removed all `<div className="space-y-2">` + `<Label>` wrappers (DatePicker handles these internally)
  - Preserved grid structures — only replaced innermost wrappers
- Verified no remaining `<Input type="date"` in the file
- Dev server compiled successfully with no errors

Stage Summary:
- **File**: `src/components/modules/SafetyPages.tsx`
- **Changes**: 15 `<Input type="date">` → `<DatePicker>` across 5 components (SafetyIncidentsPage, SafetyInspectionsPage, SafetyTrainingPage, SafetyEquipmentPage, SafetyPermitsPage)
- **Import**: Single `DatePicker` import from `@/components/ui/datetime-picker`
- **Date range pairs kept as individual Pickers**: Last/Next Inspection, Valid From/Until, Scheduled/Completed Date, Start/End Date

---
Task ID: 3c
Agent: main
Task: Refactor date/time inputs across OperationsPages, ProductionPages, AssetPages, and InventoryPages to use DatePicker component

Work Log:
- Read all 4 target files and identified exact lines containing `<Input type="date">`
- Added `DatePicker` import from `@/components/ui/datetime-picker` to each file
- Replaced all 10 native date inputs with `<DatePicker>` component across 4 files:

  **OperationsPages.tsx** (4 replacements):
  1. Line 192: "Reading Date" in meter readings create form — `form.readingDate`
  2. Line 221: "Reading Date" in meter readings edit form — `editForm.readingDate`
  3. Line 438: "Expiry Date" in safety survey create form — `form.expiryDate`
  4. Line 726: "Handover Date" in shift handover edit form — `editForm.handoverDate`

  **ProductionPages.tsx** (4 replacements):
  5. Line 371: "Start Date" in production schedule create form — `form.startDate`
  6. Line 372: "End Date" in production schedule create form — `form.endDate`
  7. Line 884: "Due Date" in production order create form — `form.scheduledEnd`
  8. Line 1002: "Start Date" in batch record create form — `form.startDate`

  **AssetPages.tsx** (1 replacement):
  9. Line 360: "Purchase Date" in asset create/edit form — `form.purchaseDate`

  **InventoryPages.tsx** (1 replacement):
  10. Line 1578: "Expected Date" in purchase order create form — `form.expectedDate`

- Pattern used for all replacements:
  - Removed outer `<div>`/`<div className="space-y-*">` wrapper and `<Label>` element
  - Passed label text as `label` prop to `<DatePicker>`
  - Converted value: `value={form.field || undefined}`
  - Converted onChange: `onChange={v => setForm(f => ({ ...f, field: v || '' }))}`
  - Preserved all grid structures — DatePicker sits directly in grid cells
- Verified 0 remaining `<Input type="date">` in all 4 files
- Dev server compiled successfully with no errors

Stage Summary:
- **OperationsPages.tsx**: 4 date inputs replaced (Reading Date ×2, Expiry Date, Handover Date)
- **ProductionPages.tsx**: 4 date inputs replaced (Start Date ×2, End Date, Due Date)
- **AssetPages.tsx**: 1 date input replaced (Purchase Date)
- **InventoryPages.tsx**: 1 date input replaced (Expected Date)
- **Total**: 10 `<Input type="date">` → `<DatePicker>` replacements

---
Task ID: 3d
Agent: main
Task: Refactor date/time inputs in RepairsPages.tsx and PlannerWorkbench.tsx

Work Log:
- Read `src/components/ui/datetime-picker.tsx` to understand component API (DatePicker, TimePicker, DateTimePicker, DateRangePicker)
- Updated `src/components/modules/RepairsPages.tsx`:
  - Added import: `import { DateTimePicker, DateRangePicker } from '@/components/ui/datetime-picker'`
  - **Repairs Analytics date filter (line ~1983)**: Replaced two `<Input type="date">` (From/To) with single `<DateRangePicker>` using `dateFrom`/`dateTo` state
  - **Downtime report filter (line ~3395)**: Replaced two `<div><Label>From Date</Label><Input type="date">` + `<div><Label>To Date</Label><Input type="date">` with single `<DateRangePicker label="Date Range">`
  - **Downtime create form (line ~1685-1686)**: Replaced two `<Input type="datetime-local">` (Start Time/End Time) with two `<DateTimePicker>` components with labels passed as props
  - **End Downtime dialog (line ~1714)**: Replaced `<Input type="datetime-local">` with `<DateTimePicker label="End Time *">`
- Updated `src/components/modules/PlannerWorkbench.tsx`:
  - Added import: `import { DatePicker, DateRangePicker } from '@/components/ui/datetime-picker'`
  - **Create WO form (line ~1285)**: Replaced `<Input type="date">` "Planned Start" with `<DatePicker label="Planned Start">`
  - **Work package form (line ~1319)**: Replaced `<Input type="date">` "Scheduled Date" with `<DatePicker label="Scheduled Date">`
  - **Create STO form (lines ~1504/1508)**: Replaced two `<Input type="date">` (Planned Start/Planned End) with single `<DateRangePicker label="Planned Period">`
- Removed all outer wrapper divs and `<Label>` elements since new components render their own label
- Lint check passed with no new errors in modified files (all pre-existing)

Stage Summary:
- **RepairsPages.tsx**: 5 replacements — 2× DateRangePicker (analytics filter, downtime report filter), 3× DateTimePicker (create form start/end, end downtime dialog)
- **PlannerWorkbench.tsx**: 3 replacements — 2× DatePicker (WO planned start, WP scheduled date), 1× DateRangePicker (STO planned period)
- **No remaining `<Input type="date">` or `<Input type="datetime-local">`** in either file (confirmed via grep)

---
Task ID: 3e
Agent: main
Task: Refactor date/time inputs across ReportPages, EnterpriseReports, ReliabilityEngineeringPage, and SettingsPages

Work Log:
- Read `src/components/ui/datetime-picker.tsx` to understand shared component APIs (DatePicker, TimePicker, DateTimePicker, DateRangePicker)
- Updated `src/components/modules/ReportPages.tsx`:
  - Added import: `import { DateRangePicker } from '@/components/ui/datetime-picker'`
  - **Removed local DateRangePicker function** (was at lines 51-68) — it was a wrapper around two native `<Input type="date">` inside a Card
  - **Updated 5 usages** (lines ~269, ~838, ~1007, ~1256, ~1472) from `<DateRangePicker startDate={...} setStartDate={...} endDate={...} setEndDate={...} />` to `<DateRangePicker label="Date Range" from={...} to={...} onChange={(f, t) => { setStartDate(f || ''); setEndDate(t || ''); }} />`
  - Kept Card/CardContent wrapper around DateRangePicker for visual consistency with original design
- Updated `src/components/modules/EnterpriseReports.tsx`:
  - Added import: `import { DateRangePicker } from '@/components/ui/datetime-picker'`
  - **Replaced date range filter (lines ~254-266)**: Removed Label + two `<Input type="date">` + "to" span, replaced with `<DateRangePicker label="Date Range">` inside existing Card wrapper
  - Kept Card, flex container, and Generate button alongside the new component
- Updated `src/components/modules/ReliabilityEngineeringPage.tsx`:
  - Added import: `import { DatePicker } from '@/components/ui/datetime-picker'`
  - **Replaced 2 date inputs (lines ~1145, ~1149)**: "Period Start" and "Period End" in MTBF/Reliability compute form — removed `<div>` + `<Label>` wrappers, replaced with individual `<DatePicker>` components with label prop
  - Kept grid structure intact (3-column grid with Asset ID, Period Start, Period End)
- Updated `src/components/modules/SettingsPages.tsx`:
  - Added import: `import { DateRangePicker, TimePicker } from '@/components/ui/datetime-picker'`
  - **Replaced backup logs date filter (lines ~2374-2378)**: Two `<Input type="date">` with "to" span inside flex container → single `<DateRangePicker>` with `from`/`to`/`onChange` props
  - **Replaced Notification Preferences quiet hours (lines ~2272-2274)**: Two `<div><Label>Start/End Time</Label><Input type="time">` → two `<TimePicker label="Start/End Time">` components
  - **Replaced Admin User Settings quiet hours (lines ~3566-3568)**: Same pattern — two `<div><Label>Start/End Time</Label><Input type="time">` → two `<TimePicker label="Start/End Time">` components
- Lint check: No new errors in modified files (all errors are pre-existing)

Stage Summary:
- **ReportPages.tsx**: Removed local DateRangePicker function, updated 5 usages to shared component with from/to/onChange API
- **EnterpriseReports.tsx**: 1 DateRangePicker replacing 2 native date inputs
- **ReliabilityEngineeringPage.tsx**: 2 DatePickers (Period Start, Period End)
- **SettingsPages.tsx**: 1 DateRangePicker (backup logs), 4 TimePickers (2× quiet hours in Notification Prefs, 2× quiet hours in Admin User Settings)
- **Total**: 6 replacements + 1 function removal + 4 import additions

---
Task ID: 3b
Agent: main
Task: Refactor date/time inputs in QualityPages.tsx to use DatePicker component

Work Log:
- Read `src/components/ui/datetime-picker.tsx` to understand DatePicker API
- Read `src/components/modules/QualityPages.tsx` — identified 12 `<Input type="date">` instances across 5 quality page components
- Added import: `import { DatePicker } from '@/components/ui/datetime-picker'`
- Reformatted 3 minified single-line edit forms (lines 134, 368, 736) into properly indented multi-line JSX AND replaced date inputs within them
- Replaced all 12 native date inputs with `<DatePicker>` component:

  **QualityInspectionsPage** (3 replacements):
  1. Line 141: "Scheduled Date" edit form — `editForm.scheduledDate || undefined`
  2. Line 142: "Completed Date" edit form — `editForm.completedDate || undefined`
  3. Line 157: "Scheduled Date" create form — `form.scheduledDate || undefined`

  **QualityAuditsPage** (3 replacements):
  4. Line 388: "Scheduled Date" edit form — `editForm.scheduledDate || undefined`
  5. Line 389: "Completed Date" edit form — `editForm.completedDate || undefined`
  6. Line 404: "Scheduled Date *" create form — `form.scheduledDate || undefined`

  **QualityCapaPage** (2 replacements):
  7. Line 770: "Due Date" edit form — `editForm.dueDate || undefined`
  8. Line 790: "Due Date" create form — `form.dueDate || undefined`

  **QualityCalibrationsPage** (4 replacements):
  9. Line 995: "Calibration Date" create form — `form.calibrationDate || undefined`
  10. Line 996: "Next Due Date" create form — `form.nextDueDate || undefined`
  11. Line 1027: "Calibration Date" edit form — `editForm.calibrationDate || undefined`
  12. Line 1028: "Next Due Date" edit form — `editForm.nextDueDate || undefined`

- Minified line reformatting:
  - Line 134 (Inspections edit): 1 minified line → 14 indented lines with DatePicker
  - Line 368 (Audits edit): 1 minified line → 16 indented lines with DatePicker
  - Line 736 (CAPA edit): 1 minified line → 16 indented lines with DatePicker
- Verified 0 remaining `<Input type="date">` in the file
- Lint check: No new errors in QualityPages.tsx
- Dev server compiled successfully

Stage Summary:
- **File**: `src/components/modules/QualityPages.tsx`
- **Total**: 12 `<Input type="date">` → `<DatePicker>` replacements
- **Minified lines reformatted**: 3 (lines 134, 368, 736) into proper multi-line JSX
- **Components affected**: QualityInspectionsPage, QualityAuditsPage, QualityCapaPage, QualityCalibrationsPage

---
Task ID: 6
Agent: main
Task: Fix WebSocket notification service connection errors

Work Log:
- Investigated WSS connection failure to port 3004
- Found notification mini-service was not running
- Fixed socket.io path from "/" to "/socket.io/" (correct default)
- Removed all console.warn/console.log from useWebSocket hook
- Changed transports to ["polling", "websocket"] with upgrade for reverse proxy compatibility
- Reduced reconnection attempts to 3 to fail fast
- Started notification service on port 3004 (verified health endpoint returns OK)

Stage Summary:
- **Notification service**: `mini-services/notification-service/index.ts` — fixed path, service running on port 3004
- **WebSocket hook**: `src/hooks/useWebSocket.ts` — silent error handling, no console spam
- **VPS note**: The notification service must be started on VPS: `cd mini-services/notification-service && bun index.ts &`


---
Task ID: 1
Agent: Main Agent
Task: Implement WO Team Member permission controls — technicians must request, managers approve

Work Log:
- Explored current WO team member management: API routes, permissions, UI, DB schema
- Designed permission model with 4 tiers: Admin/Planner (direct add), Assigner (direct add), Technician (request only), Team Member (request only)
- Added `WoTeamMemberRequest` model to Prisma schema with fields: workOrderId, requestedBy, requestedUserId, role, reason, status (pending/approved/rejected/cancelled), reviewedBy, reviewedAt, reviewNotes
- Added `addedById` and `addedVia` fields to `WorkOrderTeamMember` for audit trail
- Added User model relations: woTeamMembersAdded, woTeamMemberReqsRequested, woTeamMemberReqsAsTarget, woTeamMemberReqsReviewed
- Pushed schema to production MariaDB
- Created `POST /api/work-orders/[id]/team-member-requests` — create request (any team member can request)
- Created `GET /api/work-orders/[id]/team-member-requests` — list requests (filtered by permission)
- Created `PUT /api/work-orders/[id]/team-member-requests/[reqId]` — approve/reject (assigner/admin/planner only)
- Created `DELETE /api/work-orders/[id]/team-member-requests/[reqId]` — cancel request
- Updated `POST /api/work-orders/[id]/team-members` — locked down: only admin/planner/assigner can directly add
- Updated `DELETE /api/work-orders/[id]/team-members/[memberId]` — locked down: only admin/planner/assigner can remove
- Updated WO GET API to include teamMemberRequests
- Added notification flow: request created → notify assigner; approved → notify requester + new member; rejected → notify requester
- Frontend: Added `canManageTeamDirectly`, `canRequestTeamMember`, `canReviewTeamRequests` permission flags
- Frontend: "Add Member" button only shows for managers; "Request Member" button shows for technicians (amber style)
- Frontend: Pending requests card with approve/reject buttons for reviewers
- Frontend: My Pending Requests card with cancel option for requesters
- Frontend: Request History section showing resolved requests
- Frontend: Remove button (UserMinus icon) on each team member for managers (not on team leaders)
- Frontend: "Request Team Member" dialog with reason field

Stage Summary:
- Complete team member permission system implemented
- Technicians can NO LONGER directly add/remove team members
- Technicians must submit requests to the assigner for approval
- Admins, planners, and the original assigner can directly add/remove
- Notification system wired at all steps (request, approve, reject)
- No new lint errors introduced

---
Task ID: 2
Agent: Main Agent
Task: Fix multiple WO detail page bugs — permissions, errors, UX improvements

Work Log:
- Fixed `currentHour is not defined` runtime error in DateTimePicker (line 513) — replaced with `timeStr?.split(':')[0] ?? '00'`
- Fixed time-log POST 500 error — `wo.assignedToId` referenced wrong field, changed to `wo.assignedTo` (2 occurrences)
- Removed Edit WO from technician action button — `canEdit` now requires `canManageTeamDirectly`
- Fixed DialogContent accessibility warning — ResponsiveDialog always renders hidden DialogDescription
- Added POST handler to personal-tools API (was only GET+PUT, causing 405) — any team member can POST
- Updated Add Material dialog to pick from inventory instead of creating new items (AsyncSearchableSelect with inventory API)
- Updated materials API to auto-resolve itemName from itemId, relaxed permissions for team members
- Added per-team-member time logging — "Log For" dropdown in time log dialog for team leaders/managers
- Updated all repair pages permission guards (10 locations) to include `work_orders.update` + `user` check so technicians see action buttons
- Added `user` to RepairDowntimePage and RepairCompletionPage auth store destructuring

Stage Summary:
- 9 bugs/issues fixed in one pass
- Technicians can no longer edit WO details
- Technicians can now: add personal tools, request materials from inventory, create repair requests, log time
- Team leaders can log time on behalf of team members
- Materials dialog picks from existing inventory (no more manual name/cost entry)
- No new lint errors

---
Task ID: 3
Agent: Main Agent
Task: Fix WO detail "Work order not found" for technicians — teamMemberRequests table missing on VPS

Work Log:
- Root cause: GET `/api/work-orders/[id]` includes `teamMemberRequests` in Prisma query, but `wo_team_member_requests` table doesn't exist on VPS (prisma db push not run)
- When the table doesn't exist, the query throws a Prisma/MySQL error → caught by catch block → returns 500 → frontend shows "Work order not found"
- Fixed GET endpoint with graceful fallback: try full query with `teamMemberRequests`, if it fails (.catch), retry without it
- Added `baseInclude` constant to avoid duplicating the include object
- Ensures `teamMemberRequests` property always exists on response (empty array if table not queried)
- Verified folder names `[materialId]` and `[memberId]` are correct — terminal display was hiding leading `[` bracket

Stage Summary:
- **File**: `src/app/api/work-orders/[id]/route.ts` — graceful fallback when wo_team_member_requests table doesn't exist
- **Push**: Commit `4264db05`
- **VPS action needed**: `npx prisma db push` to create the table (then full query will work)
---
Task ID: 4
Agent: main
Task: Fix React Error #185 on 3D Viewer - 4-layer defense approach

Work Log:
- Read all relevant files from GitHub API: DigitalTwinMainPage.tsx (1872 lines), DigitalTwinViewer.tsx, digitalTwinStore.ts, useDigitalTwinScene.ts, useCameraControls.ts, useWebSocket.ts, SceneTreePanel.tsx
- Analyzed 28+ Zustand store subscriptions in DigitalTwinViewer
- Identified interaction between R3F dual reconciler, WebSocket reconnection (Socket.io 404), and React 18/19 concurrent scheduler as root cause
- Previous 3 fix attempts failed: (1) throttled progress + gated AdaptiveDpr, (2) separate React root via createRoot, (3) useRef import fix
- Implemented 4-layer defense: ErrorBoundary + triple RAF deferred mount + React.startTransition + enableRealtime=false + 500ms Canvas delay + DiagramLoader same treatment
- Pushed commit 79308f1 to GitHub

Stage Summary:
- Key files modified: DigitalTwinMainPage.tsx (+120 lines), DigitalTwinViewer.tsx (+7 lines)
- Added ViewerErrorBoundary class component for graceful error handling
- Added triple requestAnimationFrame delay before mounting DigitalTwinViewer
- Added React.startTransition for view mode switches
- Passed enableRealtime={false} to disable WebSocket in viewer context
- Increased Canvas children delay from 100ms to 500ms
- Applied same deferred mount pattern to DiagramLoader
- Commit: 79308f1 pushed to main
---
Task ID: 5
Agent: main
Task: Error #185 attempt 5 - separate React root + diagnostic displayNames

Work Log:
- Enhanced ErrorBoundary with Copy Error button, console logging of component stack
- Added displayName to all 7 components in DigitalTwinViewer.tsx for unminified error traces
- Replaced triple-RAF ViewerLoader with separate React root via createRoot()
- Added Zustand store reset() when switching to viewer/diagram mode
- Removed AdaptiveDpr/AdaptiveEvents from Canvas (simplify setup)
- Removed canvasChildrenReady gating (mount children immediately, no deferred setup)
- Removed canvasReady state (no longer needed without AdaptiveDpr/Events)
- Pushed commit 9f74029 to main

Stage Summary:
- Key approach change: Viewer now renders in a COMPLETELY SEPARATE React root via createRoot()
- Diagnostic improvements: displayName on all components + enhanced ErrorBoundary
- If error persists: browser console (F12) will show full unminified component stack
- User needs to: git pull, bun run build, pm2 restart, then test and check console if error occurs

---
Task ID: 6
Agent: sub-agent
Task: Update AI Config with 3D generation provider selection

Work Log:
- Updated `src/app/api/ai/config/route.ts`:
  - Added `provider3d?: string` to `AiConfigRecord` interface
  - Added `provider3d: 'programmatic'` to `DEFAULT_CONFIG`
  - Added validation in `validateConfigBody` — must be one of `'programmatic' | 'meshy' | 'tripo3d'`
  - Added `provider3d` to POST handler `newConfig` construction
  - Added `provider3d` to audit log `newValues`
- Updated `src/components/modules/AIConfigPage.tsx`:
  - Added `provider3d: string`, `tripo3dApiKey: string`, `tripo3dModelQuality: string` to `AiConfig` interface
  - Added defaults: `provider3d: 'programmatic'`, `tripo3dApiKey: ''`, `tripo3dModelQuality: 'preview'`
  - Added `showTripo3dApiKey` state for password toggle
  - Replaced 3D card section with enhanced version:
    - **RadioGroup provider selection** with 3 compact card options: Programmatic (Free/Zap/emerald), Meshy.ai (Premium/Box/cyan), Tripo3D (Premium/Cpu/amber)
    - **Conditional rendering**: programmatic shows "No Additional Cost" notice; meshy shows API key + art style selector; tripo3d shows API key + model quality selector (draft/preview/refined)
    - **Kept existing toggles**: Enable 3D Generation, Auto-link to Digital Twin
- All TS errors in modified files are pre-existing (confirmed via git stash comparison)

Stage Summary:
- **API route**: `src/app/api/ai/config/route.ts` — `provider3d` field added to interface, defaults, validation, POST handler, and audit log
- **Frontend**: `src/components/modules/AIConfigPage.tsx` — 3D provider radio cards with conditional fields per provider
- **New fields**: `provider3d`, `tripo3dApiKey`, `tripo3dModelQuality` on both frontend and backend
- **No new TS errors introduced**

---
Task ID: 7
Agent: sub-agent
Task: Build programmatic 3D geometry generator with GLB binary builder

Work Log:
- Created `src/lib/generate-3d/programmatic-generator.ts` — the core module (~930 lines)
- **LLM Integration**: Uses `z-ai-web-dev-sdk` (same pattern as ai-generate route) to ask the LLM to describe a machine as geometric primitives
- **System Prompt**: Instructs LLM to return JSON with 8-20 parts using box, cylinder, sphere, cone, and torus primitives, with industrial-appropriate colors, metalness, and roughness
- **Geometry Generators**: Full vertex/normal/index generation for all 5 primitive types:
  - Box: 6 faces, 24 vertices, 12 triangles
  - Cylinder: configurable radiusTop/radiusBottom/height/radialSegments, with top/bottom caps, proper tapered normals
  - Sphere: UV sphere with configurable width/height segments
  - Cone: special case of cylinder (radiusTop=0)
  - Torus: configurable torusRadius/tube/radialSegments/tubularSegments
- **Transform Pipeline**: Each part's vertices are rotated (Euler XYZ) and translated before assembly
- **GLB Binary Builder**: Full glTF 2.0 → GLB compiler:
  - Builds glTF JSON with asset, scene, nodes, meshes, accessors, bufferViews, buffers, materials
  - Packs all geometry into a single BIN buffer with proper alignment padding
  - PBR materials with baseColorFactor, metallicFactor, roughnessFactor
  - WRaps in GLB container: 12-byte header + JSON chunk (padded) + BIN chunk (padded)
  - Uses Uint32 indices for large meshes (>65535 vertices), Uint16 otherwise
- **DB Integration**: Creates AssetModel record, optionally creates DigitalTwinScene if twin exists
- **Exports**: `generateProgrammatic3DModel()` (full pipeline) and `generateGeometrySpec()` (LLM-only)

- Updated `src/app/api/ai/generate-3d/route.ts` — dual-mode support:
  - Added `resolveProvider3d()` helper: reads `provider3d` from ai-config.json (default: 'programmatic')
  - Added `provider3d` field to request body type for frontend override
  - If provider is `'programmatic'`: calls `generateProgrammatic3DModel()` synchronously, returns `status: 'succeeded'` immediately with model info
  - If provider is `'meshy'`: uses existing Meshy.ai flow with background polling
  - Existing Meshy flow preserved exactly as-is

- Updated `src/app/api/ai/generate-3d/status/route.ts` — dual-mode support:
  - Added `resolveProvider3d()` helper and `provider3d` query param
  - Extracted `checkExistingModel()` shared helper (used by both paths)
  - For programmatic provider: checks if model exists in DB, returns succeeded/failed immediately (no Meshy polling)
  - For meshy provider: existing Meshy polling flow (unchanged)

- TypeScript compilation: `✓ Compiled successfully` — no new errors
- Type check: 0 errors in our 3 files (pre-existing errors in node_modules only)

Stage Summary:
- **New file**: `src/lib/generate-3d/programmatic-generator.ts` — programmatic 3D generator with full GLB binary builder
- **Updated**: `src/app/api/ai/generate-3d/route.ts` — dual-mode (programmatic/meshy) with `provider3d` field
- **Updated**: `src/app/api/ai/generate-3d/status/route.ts` — dual-mode status check with shared DB lookup
- **Architecture**: LLM → geometry JSON → vertex generation → GLB binary → file save → DB record
- **Default provider**: `'programmatic'` (free, no external API key needed)
- **Config field**: `provider3d` in `data/ai-config.json` or per-request override

---
Task ID: 1
Agent: Main Agent
Task: Fix tool selection not working in New Tool Request modal (and all ResponsiveDialog forms)

Work Log:
- Investigated the `SearchableSelect` component (cmdk + Radix Popover pattern)
- Traced the issue through cmdk source code: CommandItem uses onClick to fire onSelect
- Discovered root cause by reading Radix UI source code:
  - `PopoverContent` uses `DismissableLayer` (NOT `DismissableLayer.Branch`)
  - When Popover is non-modal (default), `disableOutsidePointerEvents=false`
  - Dialog/Sheet's `DismissableLayer` has a document-level pointerdown listener
  - Clicking inside Popover → Dialog sees target as "outside" → fires onPointerDownOutside → dismisses dialog
  - The click event on CommandItem fires AFTER pointerdown, but dialog is already closing/unmounted
- Fixed by adding `onPointerDownOutside` handler to both SheetContent (mobile) and DialogContent (desktop) in `ResponsiveDialog`
- Handler checks if click target is inside `[data-slot="popover-content"]` and calls `e.preventDefault()` to prevent dismissal
- This fix applies to ALL forms using ResponsiveDialog with SearchableSelect (tool requests, material requests, tool transfers, damaged tools, etc.)
- Committed as 1aac49e8 and pushed

Stage Summary:
- Fixed: Tool selection in New Tool Request modal (and all ResponsiveDialog forms)
- Root cause: Radix PopoverContent uses DismissableLayer instead of DismissableLayer.Branch
- Fix location: `/src/components/shared/ResponsiveDialog.tsx`
- Commit: 1aac49e8

---
Task ID: 2
Agent: Main Agent
Task: Fix tool selection in SearchableSelect inside ResponsiveDialog (proper fix)

Work Log:
- Previous fix (onPointerDownOutside) was the right concept but not robust enough
- Deep-dived into Radix UI source code: DismissableLayer, Popover, Dialog, cmdk
- Found the exact mechanism: DismissableLayer checks `context.branches` set for pointer targets
- Popover uses DismissableLayer (not Branch), so clicks inside Popover are treated as "outside" by parent Dialog
- The proper solution is to wrap PopoverContent's inner content with DismissableLayer.Branch
- This registers the Popover as a branch, so DismissableLayer skips dismissal for pointer events inside it
- Applied to both SearchableSelect and MultiSearchableSelect in searchable-select.tsx
- Committed as 9592ac16 and pushed

Stage Summary:
- Fixed: Tool selection in ALL SearchableSelect dropdowns inside Dialogs/Sheets
- Root cause: Popover uses DismissableLayer instead of DismissableLayer.Branch
- Fix: Added DismissableLayer.Branch wrapper inside PopoverContent in searchable-select.tsx
- This is a universal fix - applies to all 18+ pages using SearchableSelect
- Previous onPointerDownOutside handler in ResponsiveDialog kept as secondary defense

---
Task ID: 28
Agent: main
Task: Fix tool selection not working on New Tool Request form

Work Log:
- Investigated `RepairsPages.tsx` for the New Tool Request form (line ~1127)
- Compared working Work Order AsyncSearchableSelect vs broken Tool AsyncSearchableSelect
- Found root cause: `toolsCache` is a `useRef<any[]>([])` but the `onValueChange` handler used `toolsCache.find(...)` instead of `toolsCache.current.find(...)`
- This caused a `TypeError: toolsCache.find is not a function` which prevented the form state from updating
- Same bug existed for `inventoryItemsCache.find` (material requests) and `assetsCache.find` (damaged tool reports)
- Fixed all 3 instances by adding `.current` to access the ref's array

Stage Summary:
- Fixed: Tool selection on New Tool Request form (`/#/repairs-tool-requests`)
- Fixed: Item selection on New Material Request form (`/#/repairs-material-requests`)
- Fixed: Asset selection on Damaged Tool Reports (`/#/repairs-damaged-tools`)
- Root cause: Missing `.current` on useRef objects in onValueChange callbacks
- The work order selector worked because it didn't use a ref cache — it did inline data mapping
