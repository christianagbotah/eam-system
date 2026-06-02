# Permission Gating — WO Detail Page

## Task
Restrict action buttons on the work order detail page for operators with only `work_orders.view_own` permission.

## Analysis
- **Existing permission patterns**: `canManageTeamDirectly` (admin/planner/assigner), `canRequestTeamMember` (team members), `canReviewTeamRequests` (reviewers), `isReadOnly` (read_only team members), `actionDisabled` (read_only OR finalized WO)
- **Gap identified**: `actionDisabled` only checked `isReadOnly` and `isWOFinalized`, but did NOT check whether the user has any modification permissions. A user with only `work_orders.view_own` who is NOT a team member would see all action buttons.
- **RepairsPages.tsx**: Already properly gated — all "New Request", "New Transfer", "Log Downtime", etc. buttons use `hasPermission('work_orders.update') || hasPermission('work_orders.create') || isAdmin()`.

## Changes Made

### 1. Added `canTakeActions` computed flag (WODetailPage, after `isReadOnly`)
```typescript
const canTakeActions = useMemo(() => {
    if (!wo || !user) return false;
    if (isAdmin()) return true;
    if (hasPermission('work_orders.update')) return true;
    if (hasPermission('work_orders.start')) return true;
    if (hasPermission('work_orders.complete')) return true;
    const isTeamMember = wo.teamMembers?.some(tm => tm.userId === user.id) || false;
    const isAssignee = wo.assignedToId === user.id;
    return isTeamMember || isAssignee;
}, [wo, user, isAdmin, hasPermission]);
```
- Returns `true` for: admins, users with `work_orders.update`/`work_orders.start`/`work_orders.complete`, team members, and assignees
- Returns `false` for: `view_own`-only users who are NOT team members/assignees

### 2. Updated `actionDisabled` to include `!canTakeActions`
```typescript
const actionDisabled = isReadOnly || isWOFinalized || !canTakeActions;
```
This automatically gates ALL buttons that use `actionDisabled`:
- **Request Material** button (line ~4578)
- **Add Personal Tool** button (line ~4760)
- **Remove Personal Tool** button (line ~4778)
- **Add Task** buttons (lines ~4803, ~4924)
- **Start/Pause/Resume/Complete** time buttons (lines ~4371-4403)
- **Log Time** button (line ~4403)

### 3. Gated the Actions dropdown itself
```tsx
{!isWOPermanentlyLocked && (canManageTeamDirectly || canTakeActions) && (
```
Previously the dropdown showed for any non-locked WO. Now it's hidden for `view_own`-only non-team-members.

### 4. Added "View Only" banner for restricted users
```tsx
{!isWOPermanentlyLocked && !isReadOnly && !canTakeActions && !canManageTeamDirectly && (
  <div className="...">View Only — you don't have permission to modify this work order</div>
)}
```

### 5. Added permission check to MaintenanceToolsPage "Add Tool" button
```tsx
{(hasPermission('tools.create') || isAdmin()) && (
  <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>Add Tool</Button>
)}
```
Also added `const { hasPermission, isAdmin } = useAuthStore();` to the component.

## Already Properly Gated (No Changes Needed)
- **Edit WO button**: Gated by `canEdit` which requires `canManageTeamDirectly` ✅
- **Add Team Member button**: Gated by `canManageTeamDirectly` ✅
- **Request Team Member button**: Gated by `canRequestTeamMember` ✅
- **Review Team Requests**: Gated by `canReviewTeamRequests` ✅
- **Material approve/reject/pick/issue buttons**: Gated by `isSupervisorOrAdminLocal()` / `isStoreOrAdminLocal()` ✅
- **RepairsPages.tsx** all action buttons: Already use `hasPermission('work_orders.update') || hasPermission('work_orders.create') || isAdmin()` ✅

## Files Modified
- `src/components/modules/MaintenancePages.tsx` — WODetailPage + MaintenanceToolsPage
