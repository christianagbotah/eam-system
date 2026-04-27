# Task 3c — PM Triggers Management Page

**Agent**: Frontend UI Agent
**File**: `/home/z/my-project/src/components/modules/PmTriggersPage.tsx`

## Work Log

### 1. Created PmTriggersPage Component
- Built a comprehensive PM Triggers management page as a default export
- Used existing project patterns: `page-content` class, shadcn/ui components, `useAuthStore`, `api` wrapper, `toast` from sonner
- Followed mobile-first responsive design with cards (not tables)

### 2. Features Implemented

#### Header
- Title "PM Triggers" with Zap icon (emerald colored)
- Description text explaining the page purpose
- Create button (permission-gated with `pm_triggers.create`)
- Refresh button

#### Stats Row (6 cards)
- Total Triggers count
- Active count (emerald colored)
- Breakdown by type: Time (sky), Meter (amber), Condition (violet), Production Count (emerald)

#### Filter Bar
- Schedule/asset/department/dept search input
- Trigger type dropdown (All/Time/Meter/Condition/Production Count)
- Active Only toggle switch
- Clear filters button (shown when filters active)

#### Triggers List (Card Grid)
- Responsive grid: 1 col mobile → 2 cols tablet → 3 cols desktop
- Each `TriggerCard` includes:
  - Trigger type badge with color (sky/amber/violet/emerald) + icon
  - Status badge (Active/Inactive)
  - Schedule title + Asset name + Asset tag badge
  - Trigger value formatted by type (hours, units, items)
  - Trigger config details parsed from JSON:
    - **time**: Cron expression with human-readable hint (e.g. "Every day at 06:00")
    - **meter**: Meter name + threshold badge
    - **condition**: Metric + operator badge (font-mono)
    - **production_count**: Threshold items badge
  - Department name + Assigned person
  - Last triggered timestamp (relative via timeAgo)
  - Actions: Toggle active (Power icon), Edit (Pencil), Delete (Trash2) — permission-gated

#### Create/Edit Trigger Dialog (ResponsiveDialog, large)
- PM Schedule selector using `AsyncSearchableSelect` fetching from `/api/pm-schedules`
- Trigger Type selector as visual toggle buttons (2×2 grid) with color coding
- Dynamic config fields based on type:
  - **time**: Cron expression input with help text examples
  - **meter**: Meter Name input + Threshold number input (2-col grid)
  - **condition**: Metric input + Operator select + Value input (3-col grid)
  - **production_count**: Threshold number input with description
- Trigger Value number input with contextual help text
- Active toggle with Switch + description
- Form validation (all required fields checked)
- Cancel + Submit buttons with loading state

#### Empty State
- Different messages for "no triggers" vs "no matching filters"
- Contextual description text

#### Delete Confirmation (ConfirmDialog)
- Uses ConfirmDialog with destructive variant
- Shows schedule name in description
- Calls DELETE `/api/pm-triggers/[id]` (admin-only soft delete)

### 3. Helper Utilities
- `parseTriggerConfig()`: Safely parses JSON triggerConfig string
- `formatCronHint()`: Converts cron expressions to human-readable hints
- `formatTriggerValue()`: Formats numeric trigger value based on type
- `renderConfigDetails()`: Renders type-specific config display with icons and badges

### 4. Sub-Components
- `TriggerCard`: Individual trigger display card
- `TriggerForm`: Create/edit form with dynamic fields
- `TriggersLoadingSkeleton`: Full page skeleton loading state

### 5. Quality
- ESLint passes with zero errors for PmTriggersPage.tsx
- Pre-existing errors in IoTPages.tsx (3) and QualityPages.tsx (1) are unrelated
- Uses emerald primary color scheme, no blue/indigo
- Mobile-first responsive design
- Default export for easy integration

## API Integration
- **GET** `/api/pm-triggers` — List triggers with type and active filters
- **POST** `/api/pm-triggers` — Create trigger
- **PUT** `/api/pm-triggers/[id]` — Update trigger (edit config + toggle active)
- **DELETE** `/api/pm-triggers/[id]` — Soft-delete trigger (admin only)
- **GET** `/api/pm-schedules` — Fetch schedules for selector dropdown

## Permissions Used
- `pm_triggers.create` — Create button visibility
- `pm_triggers.update` — Edit/toggle button visibility
- `pm_triggers.view` — API-level (enforced by backend)
- `isAdmin()` — Delete button visibility (admin-only per backend API)
