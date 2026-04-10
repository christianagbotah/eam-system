# Work Orders Module - Role Analysis

## Overview
Analysis of work orders functionality across different role directories to inform unified permission-based implementation.

---

## 📊 Feature Matrix by Role

| Feature | Admin | Planner | Supervisor | Technician | Operator |
|---------|-------|---------|------------|------------|----------|
| **View Work Orders** | ✅ All | ✅ All | ✅ All | ✅ Assigned Only | ❌ |
| **Create Work Order** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Assign Work Order** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Execute Work Order** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **View Stats** | ✅ Full | ✅ Full | ✅ Basic | ✅ Personal | ❌ |
| **Filter by Status** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Filter by Priority** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Filter by Type** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Search** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Card/Table View** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Pagination** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Export** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Tool Approvals** | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## 🎨 UI/UX Differences

### Admin (`/admin/work-orders/page.tsx`)
**Theme**: Blue gradient header
**Layout**: Table view only
**Features**:
- Create work order with full form (from request, title, description, priority, type, asset, department, dates, hours)
- Assign work order to technician
- Stats: Total, In Progress, Completed, Avg Time
- Filters: Status, Priority, Type
- Actions: Assign (draft only), View

**Stats Displayed**:
- Total Work Orders
- In Progress
- Completed
- Average Completion Time

**Create Form Fields**:
- From Existing Request (optional)
- Title*, Description*
- Priority*, Type*
- Asset, Department*
- Planned Start, Planned End
- Estimated Hours

---

### Planner (`/planner/work-orders/page.tsx`)
**Theme**: Purple/Pink gradient header
**Layout**: Card view + Table view toggle
**Features**:
- Create work order (uses CreateWorkOrderForm component)
- View work orders
- Stats: Total, Draft, Assigned, In Progress, Completed
- Filters: Status tabs, Search, Priority, Type
- Pagination (12 items per page)
- Card view with hover effects
- Table view with detailed columns

**Unique Features**:
- View mode toggle (card/table)
- Status filter as tabs (visual)
- Pagination controls
- Breakdown badge indicator
- More detailed filtering

**Stats Displayed**:
- Total
- Draft
- Assigned
- In Progress
- Completed

---

### Supervisor (`/supervisor/work-orders/page.tsx`)
**Theme**: Simple, functional
**Layout**: Tabs (Work Orders + Tool Approvals)
**Features**:
- View work orders (read-only)
- Approve/Reject tool requests
- Two tabs: Work Orders, Tool Approvals
- Basic table view

**Unique Features**:
- Tool approval workflow
- Approve/Reject buttons
- Rejection reason input
- Pending approvals count

**Stats Displayed**:
- Count badges on tabs

---

### Technician (`/technician/work-orders/page.tsx`)
**Theme**: Blue/Indigo gradient header
**Layout**: Card grid view only
**Features**:
- View assigned work orders only
- Execute work orders
- Stats: Assigned, In Progress, Completed (personal)
- Search by title, WO number, description
- Status filter dropdown
- Click card to execute

**Unique Features**:
- Personal stats only (my work)
- Execute button prominent
- Breakdown badge with animation
- Trade activity badge
- Estimated hours display
- Direct link to execute page

**Stats Displayed**:
- Assigned (personal)
- In Progress (personal)
- Completed (personal)

---

### Operator
**No work orders page** - Operators focus on:
- Production surveys
- Maintenance requests
- Production data entry

---

## 🔑 Permission Mapping

### Permissions Needed

```typescript
// View Permissions
'work_orders.view'           // View work orders list
'work_orders.view_all'       // View all work orders (admin, planner, supervisor)
'work_orders.view_assigned'  // View only assigned work orders (technician)

// Create/Edit Permissions
'work_orders.create'         // Create new work orders (admin, planner)
'work_orders.edit'           // Edit work orders (admin, planner)
'work_orders.delete'         // Delete work orders (admin only)

// Assignment Permissions
'work_orders.assign'         // Assign work orders to technicians (admin)
'work_orders.reassign'       // Reassign work orders (admin, supervisor)

// Execution Permissions
'work_orders.execute'        // Execute/complete work orders (technician)
'work_orders.acknowledge'    // Acknowledge assignment (technician)
'work_orders.start'          // Start work order (technician)
'work_orders.pause'          // Pause work order (technician)
'work_orders.complete'       // Mark as complete (technician)

// Approval Permissions
'work_orders.approve'        // Approve work orders (supervisor, manager)
'work_orders.inspect'        // Inspect completed work (supervisor)
'work_orders.close'          // Close work orders (admin, supervisor)

// Tool Management
'tool_requests.approve'      // Approve tool requests (supervisor)
'tool_requests.reject'       // Reject tool requests (supervisor)

// Export/Report Permissions
'work_orders.export'         // Export work orders data
'work_orders.reports'        // View work order reports
```

---

## 🎯 Unified Page Design

### Layout Structure
```
┌─────────────────────────────────────────────────┐
│  Header (Gradient - adapts to role)             │
│  - Title                                        │
│  - Stats Cards (filtered by permission)        │
│  - Create Button (if has permission)           │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Filters & Search                               │
│  - Status tabs/dropdown                         │
│  - Priority filter (if has permission)          │
│  - Type filter (if has permission)              │
│  - Search bar                                   │
│  - View toggle (if has permission)              │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Work Orders List                               │
│  - Card View (default for technicians)          │
│  - Table View (default for admin/planner)       │
│  - Actions (based on permissions)               │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Pagination (if has permission)                 │
└─────────────────────────────────────────────────┘
```

### Conditional Features

**Stats Cards** (show based on permission):
- Admin/Planner/Supervisor: Total, Draft, Assigned, In Progress, Completed, Avg Time
- Technician: Assigned (mine), In Progress (mine), Completed (mine)

**Filters** (show based on permission):
- All: Status filter
- Admin/Planner: Priority, Type, Search
- Technician: Search only

**Actions** (show based on permission):
- Admin: Create, Assign, View, Edit, Delete
- Planner: Create, View, Edit
- Supervisor: View, Approve Tool Requests
- Technician: Execute, View (assigned only)

**View Mode**:
- Admin/Planner: Table view default, can toggle to card
- Technician: Card view only
- Supervisor: Table view only

---

## 📝 Implementation Plan

### Step 1: Create Unified Component
- Single `/work-orders/page.tsx` file
- Use `usePermissions()` hook
- Conditional rendering based on permissions

### Step 2: Adapt UI Elements
```tsx
// Stats Cards
<PermissionSection requiredPermission="work_orders.view_all">
  <StatsCard title="Total" value={stats.total} />
</PermissionSection>

<PermissionSection requiredPermission="work_orders.view_assigned">
  <StatsCard title="My Assigned" value={stats.myAssigned} />
</PermissionSection>

// Create Button
<PermissionSection requiredPermission="work_orders.create">
  <CreateButton />
</PermissionSection>

// Assign Button
<PermissionSection requiredPermission="work_orders.assign">
  <AssignButton />
</PermissionSection>

// Execute Button
<PermissionSection requiredPermission="work_orders.execute">
  <ExecuteButton />
</PermissionSection>
```

### Step 3: Backend Filtering
- API should return filtered data based on user role
- Technicians: Only assigned work orders
- Others: All work orders

### Step 4: Testing
- Test with each role
- Verify permissions work correctly
- Ensure UI adapts properly

---

## 🚀 Benefits of Unified Approach

1. **Single Source of Truth**: One file to maintain instead of 4
2. **Consistent UX**: Same experience across roles (with appropriate restrictions)
3. **Easy Updates**: Change once, applies to all roles
4. **Scalable**: Add new roles without creating new pages
5. **Permission-Based**: Fine-grained control over features
6. **Reduced Code**: ~70% less code to maintain

---

## ✅ Next Steps

1. Create unified `/work-orders/page.tsx`
2. Implement permission-based rendering
3. Test with all roles
4. Migrate users to new page
5. Remove old role-based pages
6. Update navigation links

---

**Status**: Ready for implementation
**Estimated Time**: 2-3 hours
**Risk**: Low (can keep old pages as backup)
