# Task ID: 2 — Update ALL dialogs in MaintenancePages.tsx to use ResponsiveDialog

## Changes Made

### 1. Import Addition
- Added `import { ResponsiveDialog } from '@/components/shared/ResponsiveDialog';`

### 2. CreateMRForm (component)
- Added `id="create-mr-form"` to the `<form>` element
- Removed `<DialogFooter>` wrapper from the submit button (moved to ResponsiveDialog footer prop)

### 3. CreateWOForm (component)
- Added `id="create-wo-form"` to the `<form>` element  
- Removed `<DialogFooter>` wrapper from the submit button (moved to ResponsiveDialog footer prop)

### 4. Create MR Dialog (MaintenanceRequestsPage)
- Replaced `Dialog > DialogContent > DialogHeader > DialogTrigger` pattern
- Button now uses `onClick={() => setCreateOpen(true)}` directly
- Wrapped in Fragment (`<>...</>`) alongside ResponsiveDialog
- Submit button placed in `footer` prop using `form="create-mr-form"` attribute

### 5. Create WO Dialog (WorkOrdersPage)
- Same pattern as Create MR Dialog
- Submit button placed in `footer` prop using `form="create-wo-form"` attribute

### 6. Reject Dialog (MR Detail)
- Replaced `Dialog > DialogContent > DialogHeader > DialogFooter` with ResponsiveDialog
- Title: "Reject Request", Description: "Please provide a reason for rejection."
- Footer: Cancel + destructive Reject Request buttons side by side

### 7. Assign to Planner Dialog (MR Detail)
- Replaced `Dialog > DialogContent > DialogHeader > DialogFooter` with ResponsiveDialog
- Title: "Assign to Planner", Description with planner type instruction
- Footer: Cancel + Assign Planner buttons

### 8. Convert to WO Dialog (MR Detail) — MOST IMPORTANT
- Replaced large Dialog with `ResponsiveDialog` using `large` prop + `desktopMaxWidth="sm:max-w-4xl"`
- Title includes ClipboardList icon in emerald green
- Footer: Cancel + Create Work Order buttons with loading spinner support
- **Mobile optimizations applied:**
  - All 4 sections (blue/purple/green/amber): `p-4 sm:p-6` instead of `p-6`
  - All `SelectTrigger` elements: added `min-h-[44px]` for touch targets
  - All `Input` elements in the form: added `min-h-[44px]`
  - Badge remove buttons (X): added `min-h-[44px] min-w-[44px] flex items-center justify-center`
  - Multi-select containers: `min-h-[38px]` → `min-h-[44px]`
  - "Assign To" toggle buttons: `flex gap-2` → `flex flex-col sm:flex-row gap-2` for full-width on mobile
  - Each toggle button: added `min-h-[44px]`

### 9. WO Assign Dialog
- Replaced with ResponsiveDialog, title="Assign Work Order"

### 10. WO Complete Dialog
- Replaced with ResponsiveDialog using `large` prop
- Moved "Mark as Completed" button from inline to `footer` prop

### 11. WO Edit Dialog
- Replaced with ResponsiveDialog using `large` prop
- Footer: Cancel + Save Changes buttons

### 12. WO Time Log Dialog
- Replaced with ResponsiveDialog
- `SelectTrigger` and `Input`: added `min-h-[44px]`
- Footer: "Log Time" button

### 13. WO Material Dialog
- Replaced with ResponsiveDialog
- All inputs: added `min-h-[44px]`
- Footer: "Add Material" button

### 14. WO Reason Dialog
- Replaced with ResponsiveDialog
- Title: "Confirm Action", Description: "Please provide a reason for this action."
- "Confirm" button kept inline in children (since it's part of the form logic)

### 15. WO Personal Tool Dialog
- Replaced with ResponsiveDialog
- All inputs: added `min-h-[44px]`
- Footer: "Add Tool" button

### 16. WO Add Team Member Dialog
- Replaced with ResponsiveDialog
- `SelectTrigger`: added `min-h-[44px]`
- Footer: Cancel + Add Member buttons

## NOT Changed (as instructed)
- **ConfirmDialog** (approve MR, WO action confirmation) — left untouched
- PM Schedules, Calibration, Risk Assessment dialogs (lines 3000+) — out of scope
- All existing imports from `@/components/ui/dialog` kept (still used by later sections)

## Lint Results
- **0 new errors** introduced by these changes
- 3 pre-existing errors in other files (loto-records API routes, QualityPages.tsx)
