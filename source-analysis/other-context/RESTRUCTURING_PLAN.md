# 🏗️ EAM System Restructuring Plan - Permission-Based Architecture

**Prepared by:** Chief Technical Officer & Chief Software Architect  
**Date:** 2024  
**Objective:** Transform hardcoded role-based directories into scalable permission-based system

---

## 📊 Current State Analysis

### Problems with Current Architecture
1. **7 Role-Based Directories**: `/admin`, `/technician`, `/operator`, `/planner`, `/supervisor`, `/manager`, `/shop-attendant`
2. **Duplicate Pages**: Same functionality replicated across role folders
3. **Maintenance Nightmare**: Changes require updating multiple files
4. **No Scalability**: Adding new role = creating entire new directory structure
5. **Rigid Access Control**: Cannot customize permissions per user

### Current Structure
```
/admin/work-orders/page.tsx
/technician/work-orders/page.tsx
/planner/work-orders/page.tsx
/supervisor/work-orders/page.tsx
... (duplicated across 7 roles)
```

---

## 🎯 Target Architecture

### Unified Permission-Based Structure
```
/work-orders/page.tsx  (ONE file for all users)
  ↓
Permission checks determine what each user sees/can do
```

### Core Principles
1. **Single Source of Truth**: One page serves all users
2. **Permission-Based Rendering**: UI adapts based on user permissions
3. **Role Flexibility**: Roles are just permission bundles
4. **Easy Scaling**: New roles = new permission combinations

---

## 📁 New Directory Structure

### Phase 1: Consolidated Module Structure
```
src/app/
├── (auth)/
│   ├── login/
│   └── unauthorized/
│
├── dashboard/                    # Unified dashboard
│   └── page.tsx                 # Adapts to user permissions
│
├── work-orders/                 # Unified work orders
│   ├── page.tsx                # List view (all users)
│   ├── [id]/
│   │   └── page.tsx            # Detail view
│   ├── create/
│   │   └── page.tsx            # Create (permission: work_orders.create)
│   └── layout.tsx              # Permission guard
│
├── assets/                      # Unified assets
│   ├── page.tsx                # List view
│   ├── [id]/
│   │   └── page.tsx            # Detail view
│   ├── machines/
│   │   └── page.tsx            # Machines
│   ├── hierarchy/
│   │   └── page.tsx            # Hierarchy
│   └── layout.tsx
│
├── maintenance/                 # Unified maintenance
│   ├── requests/
│   │   └── page.tsx            # Maintenance requests
│   ├── pm-schedules/
│   │   └── page.tsx            # PM schedules
│   ├── calibration/
│   │   └── page.tsx            # Calibration
│   └── layout.tsx
│
├── inventory/                   # Unified inventory
│   ├── items/
│   ├── adjustments/
│   ├── requests/
│   └── layout.tsx
│
├── production/                  # Unified production
│   ├── surveys/
│   ├── targets/
│   ├── work-centers/
│   └── layout.tsx
│
├── analytics/                   # Unified analytics
│   ├── kpi/
│   ├── oee/
│   ├── downtime/
│   └── layout.tsx
│
├── reports/                     # Unified reports
│   └── layout.tsx
│
├── settings/                    # Unified settings
│   ├── users/
│   ├── roles/
│   ├── permissions/
│   └── layout.tsx
│
└── (deprecated)/               # Old role-based folders (to be removed)
    ├── admin/
    ├── technician/
    ├── operator/
    └── ...
```

---

## 🔐 Permission System Design

### Permission Structure
```typescript
interface Permission {
  id: string;
  module: string;      // 'work_orders', 'assets', 'inventory'
  action: string;      // 'view', 'create', 'edit', 'delete', 'approve'
  name: string;        // 'work_orders.view'
  description: string; // 'View work orders'
}
```

### Permission Categories

#### 1. Work Orders Module
```
work_orders.view          - View work orders list
work_orders.view_own      - View only own work orders
work_orders.view_all      - View all work orders
work_orders.create        - Create new work orders
work_orders.edit          - Edit work orders
work_orders.edit_own      - Edit only own work orders
work_orders.delete        - Delete work orders
work_orders.assign        - Assign work orders to technicians
work_orders.approve       - Approve work orders
work_orders.complete      - Mark work orders as complete
work_orders.close         - Close work orders
work_orders.export        - Export work orders data
```

#### 2. Assets Module
```
assets.view               - View assets
assets.create             - Create assets
assets.edit               - Edit assets
assets.delete             - Delete assets
assets.manage_hierarchy   - Manage asset hierarchy
assets.view_health        - View asset health metrics
assets.manage_documents   - Manage asset documents
```

#### 3. Maintenance Module
```
maintenance.view_requests         - View maintenance requests
maintenance.create_requests       - Create maintenance requests
maintenance.approve_requests      - Approve maintenance requests
maintenance.execute               - Execute maintenance tasks
maintenance.view_pm_schedules     - View PM schedules
maintenance.create_pm_schedules   - Create PM schedules
maintenance.manage_calibration    - Manage calibration
```

#### 4. Inventory Module
```
inventory.view            - View inventory
inventory.create          - Create inventory items
inventory.edit            - Edit inventory items
inventory.adjust          - Adjust inventory levels
inventory.request         - Request inventory items
inventory.approve         - Approve inventory requests
inventory.issue           - Issue inventory items
inventory.receive         - Receive inventory items
```

#### 5. Production Module
```
production.view           - View production data
production.create_survey  - Create production surveys
production.set_targets    - Set production targets
production.view_oee       - View OEE metrics
production.manage_centers - Manage work centers
```

#### 6. Analytics & Reports
```
analytics.view            - View analytics
analytics.export          - Export analytics data
reports.view              - View reports
reports.create            - Create custom reports
reports.export            - Export reports
```

#### 7. Settings & Admin
```
settings.view             - View settings
settings.edit             - Edit settings
users.view                - View users
users.create              - Create users
users.edit                - Edit users
users.delete              - Delete users
roles.view                - View roles
roles.create              - Create roles
roles.edit                - Edit roles
roles.assign              - Assign roles to users
permissions.view          - View permissions
permissions.assign        - Assign permissions to roles
```

---

## 🎭 Role Definitions (Permission Bundles)

### Admin Role
```typescript
const adminPermissions = [
  'work_orders.*',      // All work order permissions
  'assets.*',           // All asset permissions
  'maintenance.*',      // All maintenance permissions
  'inventory.*',        // All inventory permissions
  'production.*',       // All production permissions
  'analytics.*',        // All analytics permissions
  'reports.*',          // All reports permissions
  'settings.*',         // All settings permissions
  'users.*',            // All user management permissions
  'roles.*',            // All role management permissions
  'permissions.*'       // All permission management permissions
];
```

### Technician Role
```typescript
const technicianPermissions = [
  'work_orders.view_own',
  'work_orders.edit_own',
  'work_orders.complete',
  'maintenance.view_requests',
  'maintenance.execute',
  'assets.view',
  'inventory.view',
  'inventory.request',
  'production.view'
];
```

### Operator Role
```typescript
const operatorPermissions = [
  'production.view',
  'production.create_survey',
  'maintenance.view_requests',
  'maintenance.create_requests',
  'assets.view',
  'work_orders.view_own'
];
```

### Planner Role
```typescript
const plannerPermissions = [
  'work_orders.view_all',
  'work_orders.create',
  'work_orders.assign',
  'maintenance.view_requests',
  'maintenance.approve_requests',
  'maintenance.view_pm_schedules',
  'maintenance.create_pm_schedules',
  'production.view',
  'production.set_targets',
  'assets.view',
  'inventory.view',
  'analytics.view',
  'reports.view'
];
```

### Supervisor Role
```typescript
const supervisorPermissions = [
  'work_orders.view_all',
  'work_orders.create',
  'work_orders.assign',
  'work_orders.approve',
  'maintenance.view_requests',
  'maintenance.approve_requests',
  'assets.view',
  'inventory.view',
  'inventory.approve',
  'production.view',
  'analytics.view',
  'users.view'
];
```

### Manager Role
```typescript
const managerPermissions = [
  'work_orders.view_all',
  'work_orders.approve',
  'maintenance.view_requests',
  'maintenance.approve_requests',
  'assets.view',
  'inventory.view',
  'inventory.approve',
  'production.view',
  'production.set_targets',
  'analytics.view',
  'analytics.export',
  'reports.view',
  'reports.export',
  'users.view'
];
```

### Shop Attendant Role
```typescript
const shopAttendantPermissions = [
  'inventory.view',
  'inventory.issue',
  'inventory.receive',
  'inventory.adjust',
  'work_orders.view',
  'assets.view'
];
```

---

## 🔨 Implementation Strategy

### Phase 1: Foundation (Week 1)
**Goal:** Set up permission infrastructure

1. **Create Permission System**
   - ✅ PermissionGuard component (DONE)
   - ✅ PermissionSection component (DONE)
   - ✅ usePermissions hook (DONE)

2. **Update Backend**
   - Ensure backend returns permissions in login response
   - Create permission management endpoints
   - Create role management endpoints

3. **Update Login Flow**
   - ✅ Store permissions in localStorage (DONE)
   - ✅ Redirect to unified dashboard (NEEDS UPDATE)

### Phase 2: Unified Dashboard (Week 1-2)
**Goal:** Create single adaptive dashboard

1. **Create `/dashboard/page.tsx`**
   ```tsx
   export default function UnifiedDashboard() {
     const { hasPermission, userRole } = usePermissions();
     
     return (
       <div>
         {/* Core stats - visible to all */}
         <StatsOverview />
         
         {/* Work orders section */}
         <PermissionSection requiredPermission="work_orders.view">
           <WorkOrdersWidget />
         </PermissionSection>
         
         {/* Assets section */}
         <PermissionSection requiredPermission="assets.view">
           <AssetsWidget />
         </PermissionSection>
         
         {/* Production section */}
         <PermissionSection requiredPermission="production.view">
           <ProductionWidget />
         </PermissionSection>
         
         {/* Analytics section */}
         <PermissionSection requiredPermission="analytics.view">
           <AnalyticsWidget />
         </PermissionSection>
       </div>
     );
   }
   ```

2. **Create Dashboard Widgets**
   - Extract common widgets from role dashboards
   - Make them permission-aware
   - Reusable across all users

### Phase 3: Migrate Core Modules (Week 2-3)
**Goal:** Consolidate work orders, assets, maintenance

#### Step 1: Work Orders Migration
1. **Analyze existing work order pages**
   - `/admin/work-orders/page.tsx`
   - `/technician/my-work-orders/page.tsx`
   - `/planner/work-orders/page.tsx`
   - `/supervisor/work-orders/page.tsx`

2. **Create unified `/work-orders/page.tsx`**
   ```tsx
   export default function WorkOrdersPage() {
     const { hasPermission, hasAnyPermission } = usePermissions();
     
     // Fetch data based on permissions
     const fetchWorkOrders = () => {
       if (hasPermission('work_orders.view_all')) {
         return api.get('/work-orders'); // All work orders
       } else if (hasPermission('work_orders.view_own')) {
         return api.get('/work-orders/my'); // Only own work orders
       }
     };
     
     return (
       <div>
         <div className="flex justify-between">
           <h1>Work Orders</h1>
           
           {/* Create button - only if has permission */}
           <PermissionSection requiredPermission="work_orders.create">
             <CreateWorkOrderButton />
           </PermissionSection>
         </div>
         
         {/* Filters */}
         <WorkOrderFilters />
         
         {/* Table with permission-based actions */}
         <WorkOrderTable 
           data={workOrders}
           actions={{
             canEdit: hasPermission('work_orders.edit'),
             canDelete: hasPermission('work_orders.delete'),
             canAssign: hasPermission('work_orders.assign'),
             canComplete: hasPermission('work_orders.complete')
           }}
         />
       </div>
     );
   }
   ```

3. **Create permission-aware table component**
   ```tsx
   function WorkOrderTable({ data, actions }) {
     return (
       <table>
         <thead>
           <tr>
             <th>WO Number</th>
             <th>Title</th>
             <th>Status</th>
             <th>Actions</th>
           </tr>
         </thead>
         <tbody>
           {data.map(wo => (
             <tr key={wo.id}>
               <td>{wo.work_order_number}</td>
               <td>{wo.title}</td>
               <td>{wo.status}</td>
               <td>
                 <Link href={`/work-orders/${wo.id}`}>View</Link>
                 
                 {actions.canEdit && (
                   <button onClick={() => editWorkOrder(wo.id)}>Edit</button>
                 )}
                 
                 {actions.canDelete && (
                   <button onClick={() => deleteWorkOrder(wo.id)}>Delete</button>
                 )}
                 
                 {actions.canComplete && wo.status === 'in_progress' && (
                   <button onClick={() => completeWorkOrder(wo.id)}>Complete</button>
                 )}
               </td>
             </tr>
           ))}
         </tbody>
       </table>
     );
   }
   ```

#### Step 2: Assets Migration
Similar approach for `/assets/page.tsx`

#### Step 3: Maintenance Migration
Similar approach for `/maintenance/requests/page.tsx`

### Phase 4: Migrate Remaining Modules (Week 3-4)
- Inventory
- Production
- Analytics
- Reports
- Settings

### Phase 5: Update Navigation (Week 4)
**Goal:** Single navigation for all users

```tsx
// DashboardLayout.tsx
const navigationItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    permission: null // Always visible
  },
  {
    label: 'Work Orders',
    href: '/work-orders',
    icon: ClipboardIcon,
    permission: 'work_orders.view'
  },
  {
    label: 'Assets',
    href: '/assets',
    icon: CubeIcon,
    permission: 'assets.view'
  },
  {
    label: 'Maintenance',
    href: '/maintenance',
    icon: WrenchIcon,
    permission: 'maintenance.view_requests'
  },
  {
    label: 'Inventory',
    href: '/inventory',
    icon: PackageIcon,
    permission: 'inventory.view'
  },
  {
    label: 'Production',
    href: '/production',
    icon: ChartBarIcon,
    permission: 'production.view'
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: ChartLineIcon,
    permission: 'analytics.view'
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: DocumentIcon,
    permission: 'reports.view'
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: CogIcon,
    permission: 'settings.view'
  }
];

// Filter navigation based on permissions
const visibleItems = navigationItems.filter(item => 
  !item.permission || hasPermission(item.permission)
);
```

### Phase 6: Deprecate Old Structure (Week 5)
1. **Mark old folders as deprecated**
2. **Add redirects from old routes to new routes**
3. **Update all internal links**
4. **Remove old folders after testing**

---

## 📋 Migration Checklist

### Pre-Migration
- [ ] Backup entire codebase
- [ ] Document current functionality
- [ ] Create test user accounts for each role
- [ ] Set up permission data in backend

### Module Migration Template
For each module:
- [ ] Analyze all role-specific pages
- [ ] Identify common functionality
- [ ] Identify role-specific features
- [ ] Create unified page with permission checks
- [ ] Create permission-aware components
- [ ] Test with all role types
- [ ] Update navigation links
- [ ] Add redirects from old routes

### Post-Migration
- [ ] Remove old role-based folders
- [ ] Update documentation
- [ ] Train users on new permission system
- [ ] Monitor for issues

---

## 🎯 Benefits of New Architecture

### 1. Scalability
- Add new role = assign permissions (no new code)
- Customize permissions per user
- Easy to add new features

### 2. Maintainability
- Single source of truth
- Changes in one place
- Easier testing

### 3. Flexibility
- Mix and match permissions
- Create custom roles on the fly
- Fine-grained access control

### 4. Performance
- Less code duplication
- Smaller bundle size
- Faster development

### 5. User Experience
- Consistent UI across roles
- Smooth permission changes
- Clear access control

---

## 🚀 Quick Start Guide

### For Developers
```tsx
// 1. Import permission components
import PermissionSection from '@/components/guards/PermissionSection';
import { usePermissions } from '@/hooks/usePermissions';

// 2. Use in your page
export default function MyPage() {
  const { hasPermission } = usePermissions();
  
  return (
    <div>
      {/* Always visible */}
      <h1>My Page</h1>
      
      {/* Conditional section */}
      <PermissionSection requiredPermission="module.create">
        <CreateButton />
      </PermissionSection>
      
      {/* Conditional rendering */}
      {hasPermission('module.edit') && <EditButton />}
    </div>
  );
}
```

### For Admins
1. Go to Settings → Roles
2. Create new role
3. Assign permissions
4. Assign role to users
5. Done!

---

## 📊 Success Metrics

- **Code Reduction**: 70% less duplicate code
- **Development Speed**: 50% faster feature development
- **Maintenance Time**: 60% reduction
- **Scalability**: Unlimited roles without new code
- **User Satisfaction**: Customizable access control

---

**Next Step:** Approve this plan and begin Phase 1 implementation.
