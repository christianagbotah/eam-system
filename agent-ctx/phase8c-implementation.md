# Phase 8C Work Record

## Task
Add guided work checklists (step-by-step task execution) during WO execution.

## Changes Made

### 1. Schema (`prisma/schema.prisma`)
- Added `WorkOrderTaskExecution` model after `WorkOrderComment`
- Relations: WorkOrder.taskExecutions, PmTemplateTask.taskExecutions, User.woTasksCompleted
- Fields: id, workOrderId, templateTaskId, taskNumber, description, taskType, requiredParts, estimatedMinutes, status, completedById, completedAt, notes, findings, photos, createdAt, updatedAt

### 2. API Routes
- `src/app/api/work-orders/[id]/tasks/route.ts` — GET (fetch/auto-generate from template) + POST (manual task)
- `src/app/api/work-orders/[id]/tasks/[taskId]/route.ts` — PATCH (status transitions with auth checks)

### 3. Frontend (`src/components/modules/MaintenancePages.tsx`)
- Task Checklist card shown when WO is in_progress
- Progress bar, status icons, action buttons (Start/Done/Skip)
- Complete Task dialog with findings + notes
- Skip Task dialog with required reason
- Add Manual Task dialog for corrective WOs
- Empty state with "Add Task" CTA

## Key Design Decisions
- Auto-generation: GET auto-creates tasks from PM template on first access
- State machine: pending → in_progress → completed/skipped/failed
- Auth: assignee, team leader, team member, or admin can update tasks
- Notes are appended (not overwritten) with timestamp + username
- Table created directly in SQLite (prisma db push blocked)
