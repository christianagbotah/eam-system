# Task 6: Convert-to-WO Dialog Rewrite

## Summary
Rewrote the Convert-to-WO dialog in `src/components/modules/MaintenancePages.tsx` to match the source project's 4-section layout with color-coded backgrounds.

## Changes Made

### 1. State Definition (lines ~463-491)
- Replaced old `convertForm` state with expanded version containing 17 fields across 3 categories
- Added `departments`, `inventoryItems`, `toolsData`, `usersMap` state variables for dropdown data
- New fields: `workOrderType`, `tradeActivity`, `technicalDescription`, `scheduledDate`, `deliveryDate`, `estimatedHoursDisplay`, `departmentIds`, `assignType`, `technicians[]`, `supervisors[]`, `teamLeaderId`, `requiredParts[]`, `requiredTools[]`, `safetyNotes`, `ppeRequired`, `notes`

### 2. Helper Functions (lines ~633-666)
- Replaced `addTeamMember`/`removeTeamMember`/`updateTeamMember` with:
  - `handleEstHoursChange()` - Converts "2:30" format to "2.5" decimal
  - `addToArray()` - Generic multi-select add for departments, technicians, supervisors, parts, tools
  - `removeFromArray()` - Generic multi-select remove

### 3. openConvertDialog (lines ~547-591)
- Made async to load dropdown data before opening
- Fetches departments, inventory, tools, and all users in parallel
- Builds `usersMap` for label resolution on technician/supervisor badges
- Pre-fills `departmentIds` from MR's `departmentId`
- Pre-fills `technicalDescription` from MR's `title`

### 4. handleConvert (lines ~593-631)
- Uses `mr.title` instead of form title (source doesn't have separate title field)
- Sends new API fields: `workOrderType`, `tradeActivity`, `technicalDescription`, `deliveryDateRequired`, `safetyNotes`, `ppeRequired`, `notes`, `requiredParts`, `requiredTools`
- Technician assignment: first technician as `assignedTo`, optional `teamLeaderId`, rest as `teamMembers`
- Supervisor assignment: first supervisor as `assignedSupervisorId`

### 5. Dialog JSX (lines ~781-1163)
Completely rewritten with 4 color-coded sections:

**Section 1: Request Information (blue)** - Read-only MR details
- Request Number, Machine/Asset, Location, Breakdown status
- Problem Description, Requested By, Date Sent
- Background: `bg-blue-50 border-2 border-blue-200 rounded-xl p-6`

**Section 2: Work Order Details (purple)** - Editable WO fields
- Work Order Type (breakdown/preventive/corrective/other)
- Priority (low/medium/high/urgent)
- Trade Activity (mechanical/electrical/civil/facility/workshop/other) - NEW
- Est. Hours with "2:30" format support - NEW
- Technical Description textarea (pre-filled from MR title)
- Scheduled Date (datetime-local) - NEW
- Delivery Date (date) - NEW
- Background: `bg-purple-50 border-2 border-purple-200 rounded-xl p-6`

**Section 3: Resource Assignment (green)** - People and materials
- Department(s) multi-select tags from departments API
- Assign To toggle: Technician(s) vs Supervisor(s) buttons
- Technicians multi-select with AsyncSearchableSelect (filtered by departments)
- Supervisors multi-select with AsyncSearchableSelect (filtered by departments) - NEW
- Team Leader AsyncSearchableSelect from all users - NEW
- Required Spare Parts multi-select tags from inventory API - NEW
- Required Tools multi-select tags from tools API - NEW
- Background: `bg-green-50 border-2 border-green-200 rounded-xl p-6`

**Section 4: Safety Notes (amber)** - Safety and general notes
- Safety Notes textarea
- PPE Required text input
- General Notes textarea
- Background: `bg-amber-50 border-2 border-amber-200 rounded-xl p-6`

### 6. Dialog Width
- Increased from `sm:max-w-2xl` to `sm:max-w-4xl` for the larger 4-section layout

## Quality
- ESLint passes cleanly on MaintenancePages.tsx (0 errors)
- 3 pre-existing lint errors in other files (loto-records, QualityPages) unrelated to this change
- Dev server compiles and serves successfully (HTTP 200)
- All existing MR detail page functionality preserved (header, body, sidebar, comments, workflow timeline, reject/approve/assign-planner dialogs)
- No existing imports modified; no new imports needed (all icons already imported)
