# Task 1: Extract Shared Components from EAMApp.tsx

## Summary
Extracted shared utility components and layout components from `src/components/EAMApp.tsx` into `src/components/shared/` directory.

## Files Created

### 1. `/src/components/shared/helpers.tsx` (193 lines)
**Extracted from EAMApp.tsx lines 204–351, 810–840**

Named exports:
- `StatusIcon` — Maps status strings to lucide-react icons
- `getInitials(name)` — Extracts up to 2 initials from a full name
- `formatDate(d?)` — Formats date to "MMM d, yyyy"
- `formatDateTime(d?)` — Formats datetime to "MMM d, yyyy HH:mm"
- `timeAgo(d?)` — Relative time string via date-fns
- `StatusBadge` — Badge with status color + icon
- `PriorityBadge` — Badge with priority color
- `EmptyState` — Centered empty state with icon, title, description
- `LoadingScreen` — Full-screen branded loading animation
- `LoadingSkeleton` — Page-level skeleton placeholders
- `MiniBarChart` — Tiny 7-bar sparkline chart
- `ProgressRing` — SVG circular progress indicator

Also includes internal color maps: `priorityColors`, `mrStatusColors`, `woStatusColors`.

**Note**: Named `.tsx` (not `.ts`) because `StatusIcon` contains JSX.

### 2. `/src/components/shared/Sidebar.tsx` (503 lines)
**Extracted from EAMApp.tsx lines 353–777**

Exports:
- `default Sidebar` — Desktop + mobile sidebar wrapper
- Internal `SidebarContent` component (not exported)

Contains:
- `NavGroup` interface definition
- All 12 menu group definitions (Dashboard, Chat, Assets, Maintenance, IoT, Analytics, Operations, Production, Quality, Safety, Inventory, Reports, Settings)
- Collapsible submenu logic with auto-expand on active page
- Module-aware and permission-based filtering
- Desktop collapsed/expanded states with tooltips
- Mobile overlay sidebar

### 3. `/src/components/shared/NotificationPopover.tsx` (238 lines)
**Extracted from EAMApp.tsx lines 5822–6061**

Exports:
- `default NotificationPopover`

Contains:
- Bell icon with unread count badge
- Popover with notification list (loading/empty/list states)
- Mark individual as read + mark all read
- Notification detail dialog with type, entity, status metadata
- Action URL navigation support

## Verification
- All 3 files pass ESLint with zero errors
- Dev server compiles successfully (GET / 200)
- Original EAMApp.tsx was NOT modified
