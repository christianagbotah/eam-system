# Task 7 - PM Trigger CRUD API + PM Analytics API + Setup Cron Job (Phase 1c)

## Summary
All 6 deliverables completed successfully. Lint passes clean, database seeded with new data.

## Files Created

### 1. PM Trigger CRUD API
- **`src/app/api/pm-triggers/route.ts`** — GET (list with filters) + POST (create with validation)
  - Filters: `scheduleId`, `triggerType`, `active`
  - Validates `triggerConfig` JSON per triggerType (time=cron, meter=threshold, condition=metric/operator, production_count=threshold)
  - Permission checks: `pm_triggers.view` for GET, `pm_triggers.create` for POST
  - Plant scoping via schedule → asset
  - Audit logging on create
  - Unique constraint check (one trigger per schedule)

### 2. PM Trigger Detail API
- **`src/app/api/pm-triggers/[id]/route.ts`** — GET + PUT + DELETE
  - GET: single trigger with full schedule details
  - PUT: update with same validation as create, `pm_triggers.update` permission
  - DELETE: soft delete (`isActive=false`), admin-only, audit log

### 3. PM Analytics API
- **`src/app/api/pm-analytics/route.ts`** — GET
  - `complianceRate`: % of PM WOs completed on time (completedOnTime/totalCompleted)
  - `overdueCount`: active schedules past nextDueDate
  - `upcomingCount`: schedules due within 7 days
  - `totalSchedules`, `totalGenerated`, `avgCompletionDays`
  - `byDepartment`: per-department schedule counts + compliance
  - `monthlyTrend`: last 12 months of PM WO generation (generated + completed per month)
  - Uses parallel `Promise.all()` for performance
  - `pm_analytics.view` permission required

### 4. Cron Job for PM Check-Due
- **`src/app/api/pm-schedules/check-due-cron/route.ts`** — POST
  - Phase 1: Same WO generation logic as check-due
  - Phase 2: Detects overdue PM schedules (nextDueDate < now AND no open WO exists)
  - Phase 3: Sends `pm_overdue` notifications for overdue schedules
  - Returns comprehensive summary: `dueSchedulesChecked`, `workOrdersGenerated`, `overdueSchedulesFound`, `overdueAlertsSent`, etc.
- **`mini-services/pm-cron/index.ts`** — Updated to call check-due-cron instead of check-due

## Files Modified

### 5. Seed PM Templates + Triggers
- **`prisma/seed.ts`** — Added:
  - Cleanup: `pmTrigger.deleteMany()` and `pmTemplateTask.deleteMany()` + `pmTemplate.deleteMany()` before `pmSchedule.deleteMany()`
  - Step 12b: 3 PM templates with 15 total tasks:
    1. "Monthly Motor Inspection" (inspection/electrical, 60 min, 4 tasks)
    2. "Quarterly HVAC Service" (preventive/hvac, 120 min, 5 tasks)
    3. "Annual Overhaul" (preventive/mechanical, 480 min, 6 tasks)
  - Step 12c: 3 PM triggers linked to existing PM schedules:
    1. meter trigger (run_hours threshold: 5000)
    2. time trigger (cron: every Monday 6AM)
    3. production_count trigger (threshold: 10000)

## Verification
- `bun run lint` — passes clean (no errors)
- `bun run prisma/seed.ts` — seeds successfully with all new data
- Dev server compiles without issues (pre-existing LoadingScreen error is unrelated)
