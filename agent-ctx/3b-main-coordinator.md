# Task 3b — PM Templates Page Component

## Agent: Main Coordinator

## Work Log:

### 1. Research Phase
- Read `/home/z/my-project/worklog.md` to understand project context (10 prior task IDs)
- Read existing `MaintenancePages.tsx` (4015 lines) to understand component patterns
- Read all PM Template API routes:
  - `GET /api/pm-templates` — list with filters (search, type, active), includes `_count.tasks` and `createdBy`
  - `POST /api/pm-templates` — create with requiredSkills/requiredTools as JSON arrays
  - `GET /api/pm-templates/[id]` — single with tasks and `_count.schedules`
  - `PUT /api/pm-templates/[id]` — update (note: does NOT include requiredSkills/requiredTools)
  - `DELETE /api/pm-templates/[id]` — soft delete (isActive=false)
  - `POST /api/pm-templates/[id]/tasks` — add task with auto-increment taskNumber
  - `PUT /api/pm-templates/[id]/tasks` — reorder tasks (taskIds array)
  - `DELETE /api/pm-templates/[id]/tasks/[taskId]` — hard delete task
- Read shared components: ConfirmDialog, ResponsiveDialog, helpers (EmptyState, PriorityBadge, StatusBadge, LoadingSkeleton)
- Read api.ts lib for request patterns

### 2. Implementation
- Added 4 new icon imports: `ChevronDown`, `GripVertical`, `Droplets`, `RotateCcw`
- Created TypeScript interfaces: `PmTemplateItem`, `PmTemplateTaskItem`
- Created config maps: `TEMPLATE_TYPE_CONFIG` (5 types), `TASK_TYPE_CONFIG` (6 types)
- Created helper components: `TemplateTypeBadge`, `TaskTypeBadge`
- Built `PmTemplatesPage` component (~600 lines) with:
  1. **Header** with "PM Templates" title, description, permission-gated "New Template" button
  2. **Stats row** (3 cards): Total Templates, Active, Avg Tasks/Template
  3. **Filter bar**: Search input, type select (All/Preventive/Predictive/Inspection/Calibration/Lubrication), active/inactive toggle switch
  4. **Templates table** (8 columns): Template Name, Type (badge with icon), Category, Tasks Count, Priority (badge), Duration, Status, Actions dropdown (Edit/Activate/Deactivate)
  5. **Create/Edit Dialog** (ResponsiveDialog, large): Title*, Description, Type, Category, Priority, Duration*, Required Skills (comma→JSON, create only), Required Tools (comma→JSON, create only)
  6. **Task Checklist Builder** (expandable, edit only):
     - Expandable header with task count badge and chevron toggle
     - Task list with: GripVertical handle, task number badge, description, type badge, estimated minutes, required parts, delete button (confirm dialog)
     - Add Task form: description*, type select, estimated minutes, required parts, "Add Task" button
     - API integration: POST to add, DELETE to remove, GET single template to load tasks

### 3. Quality
- ESLint passes with zero errors for MaintenancePages.tsx (4 pre-existing errors in other files: IoTPages.tsx, QualityPages.tsx)
- Dev server compiles successfully (266ms)
- All existing patterns followed: emerald color scheme, border-0 shadow-sm cards, dark mode support, mobile-first responsive design

## Stage Summary:
- ~600 lines of new component code appended to MaintenancePages.tsx
- 4 new icon imports added to existing import block
- 2 TypeScript interfaces created
- 2 config maps with 11 type configurations total
- 2 helper badge components
- 1 main page component with full CRUD + task checklist builder
- 2 ConfirmDialog instances (template deactivate, task delete)
- 1 ResponsiveDialog instance (create/edit template, large size)
- Zero lint errors introduced
