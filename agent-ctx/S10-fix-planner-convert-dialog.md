# Task S10: Fix PlannerWorkbench.tsx to use proper conversion dialog

## Problem
Lines 420-432 of `PlannerWorkbench.tsx` had `handleCreateWOFromMR` that fired an API call instantly with **hardcoded** payload (`title: 'WO from MR'`, `priority: 'medium'`, `type: 'corrective'`) — no dialog, no user input, completely ignoring the MR's actual data.

## Solution

### 1. Created `/home/z/my-project/src/components/shared/ConvertMRToWODialog.tsx`
A new shared component that encapsulates the full 4-section conversion form, matching the pattern already used in `MaintenancePages.tsx`:

- **Props**: `open`, `onOpenChange`, `mr` (the MR to convert), `onSuccess` callback
- **Section 1** (blue): Read-only request info (request number, asset, location, breakdown status, description, requester, date)
- **Section 2** (purple): WO details (type, priority, trade, est. hours, technical description, scheduled/delivery dates)
- **Section 3** (green): Resource assignment via `WorkerAssignmentSelector`, plus spare parts & tools multi-select from inventory/tools APIs
- **Section 4** (amber): Safety notes, PPE required, general notes

**Smart defaults from MR**:
- `priority` → `mr.priority` (with `urgent` → `high` mapping)
- `workOrderType` → derived from `mr.category` (preventive/corrective)
- `technicalDescription` → defaults to `mr.title`

**Responsive design**:
- Desktop: `ResponsiveDialog` with `ScrollArea` (max-h-70vh) for all 4 sections
- Mobile: `MobileStepperSheet` with 4 steps (Request → Details → Resources → Safety)

**API integration**:
- Loads inventory and tools data on dialog open
- Builds the same payload structure as `MaintenancePages.tsx` (team members, assignment type, all optional fields)
- Posts to `/api/maintenance-requests/${mr.id}/convert`

### 2. Modified `/home/z/my-project/src/components/modules/PlannerWorkbench.tsx`
- Added import for `ConvertMRToWODialog`
- Added `const [convertMR, setConvertMR] = useState<any>(null)` state
- Replaced `handleCreateWOFromMR(mrId)` — now synchronous, finds the MR from `approvedMRs` and sets `convertMR` to open the dialog
- Added `handleConvertSuccess()` that clears `convertMR`, triggers `refreshKey` increment, and shows success toast
- Added `<ConvertMRToWODialog>` component in JSX before the closing `</div>`

### Files Changed
1. **Created**: `src/components/shared/ConvertMRToWODialog.tsx` (~400 lines)
2. **Modified**: `src/components/modules/PlannerWorkbench.tsx` (4 edits: import, state, handler, JSX)

### Lint Result
- No errors or warnings in either file.

### What was NOT changed
- Kanban board logic
- Drag-and-drop handlers
- Other PlannerWorkbench features (work packages, STO/shutdown, capacity panel, filters, etc.)
- `MaintenancePages.tsx` (the original conversion dialog remains untouched)
