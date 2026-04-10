# 🚀 Week 1 Implementation - START TODAY

## Overview
**Goal:** Set up permission infrastructure and create unified dashboard  
**Timeline:** 5 days  
**Status:** Ready to begin

---

## Day 1: Backend Permission Setup (4 hours)

### Task 1.1: Create Permission Seeder (1 hour)

**File:** `c:\wamp64\www\factorymanager\app\Database\Seeds\PermissionsSeeder.php`

```php
<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class PermissionsSeeder extends Seeder
{
    public function run()
    {
        $permissions = [
            // ASSET Module
            ['name' => 'assets.view', 'module' => 'ASSET', 'description' => 'View assets'],
            ['name' => 'assets.create', 'module' => 'ASSET', 'description' => 'Create assets'],
            ['name' => 'assets.edit', 'module' => 'ASSET', 'description' => 'Edit assets'],
            ['name' => 'assets.delete', 'module' => 'ASSET', 'description' => 'Delete assets'],
            ['name' => 'machines.view', 'module' => 'ASSET', 'description' => 'View machines'],
            ['name' => 'machines.create', 'module' => 'ASSET', 'description' => 'Create machines'],
            ['name' => 'bom.view', 'module' => 'ASSET', 'description' => 'View BOM'],
            ['name' => 'bom.create', 'module' => 'ASSET', 'description' => 'Create BOM'],
            
            // RWOP Module (Work Orders)
            ['name' => 'work_orders.view', 'module' => 'RWOP', 'description' => 'View work orders'],
            ['name' => 'work_orders.view_own', 'module' => 'RWOP', 'description' => 'View own work orders'],
            ['name' => 'work_orders.view_all', 'module' => 'RWOP', 'description' => 'View all work orders'],
            ['name' => 'work_orders.create', 'module' => 'RWOP', 'description' => 'Create work orders'],
            ['name' => 'work_orders.edit', 'module' => 'RWOP', 'description' => 'Edit work orders'],
            ['name' => 'work_orders.delete', 'module' => 'RWOP', 'description' => 'Delete work orders'],
            ['name' => 'work_orders.assign', 'module' => 'RWOP', 'description' => 'Assign work orders'],
            ['name' => 'work_orders.complete', 'module' => 'RWOP', 'description' => 'Complete work orders'],
            ['name' => 'maintenance_requests.view', 'module' => 'RWOP', 'description' => 'View maintenance requests'],
            ['name' => 'maintenance_requests.create', 'module' => 'RWOP', 'description' => 'Create maintenance requests'],
            ['name' => 'maintenance_requests.approve', 'module' => 'RWOP', 'description' => 'Approve maintenance requests'],
            
            // MRMP Module (PM System)
            ['name' => 'pm_schedules.view', 'module' => 'MRMP', 'description' => 'View PM schedules'],
            ['name' => 'pm_schedules.create', 'module' => 'MRMP', 'description' => 'Create PM schedules'],
            ['name' => 'pm_schedules.edit', 'module' => 'MRMP', 'description' => 'Edit PM schedules'],
            ['name' => 'pm_work_orders.view', 'module' => 'MRMP', 'description' => 'View PM work orders'],
            ['name' => 'pm_work_orders.execute', 'module' => 'MRMP', 'description' => 'Execute PM work orders'],
            ['name' => 'calibration.view', 'module' => 'MRMP', 'description' => 'View calibration'],
            ['name' => 'calibration.manage', 'module' => 'MRMP', 'description' => 'Manage calibration'],
            
            // MPMP Module (Production)
            ['name' => 'production.view', 'module' => 'MPMP', 'description' => 'View production'],
            ['name' => 'production_surveys.view', 'module' => 'MPMP', 'description' => 'View production surveys'],
            ['name' => 'production_surveys.create', 'module' => 'MPMP', 'description' => 'Create production surveys'],
            ['name' => 'production_targets.view', 'module' => 'MPMP', 'description' => 'View production targets'],
            ['name' => 'production_targets.create', 'module' => 'MPMP', 'description' => 'Create production targets'],
            ['name' => 'oee.view', 'module' => 'MPMP', 'description' => 'View OEE'],
            ['name' => 'downtime.view', 'module' => 'MPMP', 'description' => 'View downtime'],
            
            // IMS Module (Inventory)
            ['name' => 'inventory.view', 'module' => 'IMS', 'description' => 'View inventory'],
            ['name' => 'inventory.create', 'module' => 'IMS', 'description' => 'Create inventory items'],
            ['name' => 'inventory.adjust', 'module' => 'IMS', 'description' => 'Adjust inventory'],
            ['name' => 'parts.view', 'module' => 'IMS', 'description' => 'View parts'],
            ['name' => 'parts.create', 'module' => 'IMS', 'description' => 'Create parts'],
            
            // HRMS Module
            ['name' => 'users.view', 'module' => 'HRMS', 'description' => 'View users'],
            ['name' => 'users.create', 'module' => 'HRMS', 'description' => 'Create users'],
            ['name' => 'users.edit', 'module' => 'HRMS', 'description' => 'Edit users'],
            ['name' => 'training.view', 'module' => 'HRMS', 'description' => 'View training'],
            ['name' => 'training.create', 'module' => 'HRMS', 'description' => 'Create training'],
            
            // IOT Module
            ['name' => 'iot_devices.view', 'module' => 'IOT', 'description' => 'View IoT devices'],
            ['name' => 'iot_devices.manage', 'module' => 'IOT', 'description' => 'Manage IoT devices'],
            ['name' => 'predictive.view', 'module' => 'IOT', 'description' => 'View predictive maintenance'],
            
            // TRAC Module (Safety)
            ['name' => 'loto.view', 'module' => 'TRAC', 'description' => 'View LOTO'],
            ['name' => 'loto.create', 'module' => 'TRAC', 'description' => 'Create LOTO'],
            ['name' => 'permits.view', 'module' => 'TRAC', 'description' => 'View permits'],
            ['name' => 'permits.create', 'module' => 'TRAC', 'description' => 'Create permits'],
            ['name' => 'risk_assessment.view', 'module' => 'TRAC', 'description' => 'View risk assessment'],
            
            // REPORTS Module
            ['name' => 'reports.view', 'module' => 'REPORTS', 'description' => 'View reports'],
            ['name' => 'reports.export', 'module' => 'REPORTS', 'description' => 'Export reports'],
            ['name' => 'analytics.view', 'module' => 'REPORTS', 'description' => 'View analytics'],
            
            // Core Module
            ['name' => 'dashboard.view', 'module' => 'Core', 'description' => 'View dashboard'],
            ['name' => 'settings.view', 'module' => 'Core', 'description' => 'View settings'],
            ['name' => 'settings.edit', 'module' => 'Core', 'description' => 'Edit settings'],
            ['name' => 'roles.view', 'module' => 'Core', 'description' => 'View roles'],
            ['name' => 'roles.create', 'module' => 'Core', 'description' => 'Create roles'],
            ['name' => 'permissions.view', 'module' => 'Core', 'description' => 'View permissions'],
            ['name' => 'permissions.assign', 'module' => 'Core', 'description' => 'Assign permissions'],
        ];

        foreach ($permissions as $permission) {
            $this->db->table('permissions')->insert($permission);
        }
    }
}
```

### Task 1.2: Create Role Permissions Seeder (1 hour)

**File:** `c:\wamp64\www\factorymanager\app\Database\Seeds\RolePermissionsSeeder.php`

```php
<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class RolePermissionsSeeder extends Seeder
{
    public function run()
    {
        // Get all permissions
        $allPermissions = $this->db->table('permissions')->select('name')->get()->getResultArray();
        $allPermissionNames = array_column($allPermissions, 'name');
        
        // Admin - all permissions
        $adminPermissions = $allPermissionNames;
        
        // Technician permissions
        $technicianPermissions = [
            'work_orders.view_own',
            'work_orders.edit_own',
            'work_orders.complete',
            'maintenance_requests.view',
            'maintenance_requests.create',
            'pm_work_orders.view',
            'pm_work_orders.execute',
            'assets.view',
            'machines.view',
            'inventory.view',
            'parts.view',
            'dashboard.view'
        ];
        
        // Operator permissions
        $operatorPermissions = [
            'production.view',
            'production_surveys.view',
            'production_surveys.create',
            'maintenance_requests.view',
            'maintenance_requests.create',
            'assets.view',
            'machines.view',
            'dashboard.view'
        ];
        
        // Planner permissions
        $plannerPermissions = [
            'work_orders.view_all',
            'work_orders.create',
            'work_orders.assign',
            'maintenance_requests.view',
            'maintenance_requests.approve',
            'pm_schedules.view',
            'pm_schedules.create',
            'production_targets.view',
            'production_targets.create',
            'assets.view',
            'machines.view',
            'inventory.view',
            'reports.view',
            'analytics.view',
            'dashboard.view'
        ];
        
        // Supervisor permissions
        $supervisorPermissions = [
            'work_orders.view_all',
            'work_orders.create',
            'work_orders.assign',
            'work_orders.approve',
            'maintenance_requests.view',
            'maintenance_requests.approve',
            'assets.view',
            'machines.view',
            'inventory.view',
            'users.view',
            'reports.view',
            'dashboard.view'
        ];
        
        // Manager permissions
        $managerPermissions = [
            'work_orders.view_all',
            'work_orders.approve',
            'maintenance_requests.view',
            'maintenance_requests.approve',
            'pm_schedules.view',
            'production.view',
            'production_targets.view',
            'production_targets.create',
            'assets.view',
            'machines.view',
            'inventory.view',
            'reports.view',
            'reports.export',
            'analytics.view',
            'users.view',
            'dashboard.view'
        ];
        
        // Shop Attendant permissions
        $shopAttendantPermissions = [
            'inventory.view',
            'inventory.adjust',
            'parts.view',
            'parts.create',
            'work_orders.view',
            'assets.view',
            'dashboard.view'
        ];
        
        // Assign permissions to roles
        $rolePermissions = [
            'admin' => $adminPermissions,
            'technician' => $technicianPermissions,
            'operator' => $operatorPermissions,
            'planner' => $plannerPermissions,
            'supervisor' => $supervisorPermissions,
            'manager' => $managerPermissions,
            'shop-attendant' => $shopAttendantPermissions
        ];
        
        foreach ($rolePermissions as $role => $permissions) {
            foreach ($permissions as $permission) {
                $this->db->table('role_permissions')->insert([
                    'role' => $role,
                    'permission' => $permission
                ]);
            }
        }
    }
}
```

### Task 1.3: Run Seeders (15 minutes)

```bash
cd c:\wamp64\www\factorymanager
php spark db:seed PermissionsSeeder
php spark db:seed RolePermissionsSeeder
```

### Task 1.4: Update AuthController to Return Permissions (1 hour)

**File:** `c:\wamp64\www\factorymanager\app\Controllers\Api\V1\Modules\Core\AuthController.php`

Find the `login()` method and update it:

```php
public function login()
{
    $rules = [
        'username' => 'required',
        'password' => 'required'
    ];

    if (!$this->validate($rules)) {
        return $this->fail($this->validator->getErrors());
    }

    $username = $this->request->getVar('username');
    $password = $this->request->getVar('password');

    $userModel = new \App\Models\UserModel();
    $user = $userModel->where('username', $username)->first();

    if (!$user || !password_verify($password, $user['password'])) {
        return $this->failUnauthorized('Invalid credentials');
    }

    // Generate JWT token
    $token = $this->generateJWT($user);
    
    // Get user permissions based on role
    $permissions = $this->getUserPermissions($user['role']);
    
    // Add permissions to user object
    $user['permissions'] = $permissions;
    
    // Remove sensitive data
    unset($user['password']);

    return $this->respond([
        'status' => 'success',
        'data' => [
            'token' => $token,
            'user' => $user
        ]
    ]);
}

private function getUserPermissions($role)
{
    $db = \Config\Database::connect();
    
    // Get permissions for this role
    $permissions = $db->table('role_permissions')
        ->where('role', $role)
        ->get()
        ->getResultArray();
    
    return array_column($permissions, 'permission');
}
```

### Task 1.5: Test Backend (30 minutes)

```bash
# Test login endpoint
curl -X POST http://localhost/factorymanager/public/index.php/api/v1/eam/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Should return:
{
  "status": "success",
  "data": {
    "token": "...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "permissions": ["assets.view", "work_orders.view", ...]
    }
  }
}
```

---

## Day 2-3: Create Unified Dashboard (8 hours)

### Task 2.1: Update Login Redirect (15 minutes)

**File:** `c:\devs\factorymanager\src\app\login\page.tsx`

Already done! Just verify it redirects to `/dashboard`.

### Task 2.2: Create Dashboard Widgets Directory (5 minutes)

```bash
cd c:\devs\factorymanager\src\components\dashboard
mkdir widgets
```

### Task 2.3: Create WorkOrdersWidget (1 hour)

**File:** `c:\devs\factorymanager\src\components\dashboard\widgets\WorkOrdersWidget.tsx`

Copy the code from `IMPLEMENTATION_ROADMAP.md` Task 1.3, Day 4.

### Task 2.4: Create Other Widgets (3 hours)

Create these files with similar structure:
- `AssetsWidget.tsx`
- `ProductionWidget.tsx`
- `MaintenanceWidget.tsx`
- `InventoryWidget.tsx`
- `AnalyticsWidget.tsx`

### Task 2.5: Create Unified Dashboard Page (2 hours)

**File:** `c:\devs\factorymanager\src\app\dashboard\page.tsx`

Copy the complete code from `IMPLEMENTATION_ROADMAP.md` Week 1, Task 1.3.

### Task 2.6: Update Dashboard Layout (1 hour)

**File:** `c:\devs\factorymanager\src\app\dashboard\layout.tsx`

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function UnifiedDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return <DashboardLayout>{children}</DashboardLayout>;
}
```

---

## Day 4: Create Backend Dashboard Endpoint (2 hours)

### Task 4.1: Create Unified Dashboard Controller

**File:** `c:\wamp64\www\factorymanager\app\Controllers\Api\V1\Modules\Core\DashboardController.php`

Add this method:

```php
public function unified()
{
    try {
        $userId = $this->request->user_id; // From JWT
        $userRole = $this->request->user_role; // From JWT
        
        $data = [
            'workOrders' => $this->getWorkOrderStats($userId, $userRole),
            'assets' => $this->getAssetStats(),
            'inventory' => $this->getInventoryStats(),
            'production' => $this->getProductionStats($userId, $userRole)
        ];
        
        return $this->respond([
            'status' => 'success',
            'data' => $data
        ]);
    } catch (\Exception $e) {
        return $this->fail($e->getMessage());
    }
}

private function getWorkOrderStats($userId, $userRole)
{
    $db = \Config\Database::connect();
    
    $query = $db->table('work_orders');
    
    // Filter based on role
    if ($userRole === 'technician') {
        $query->where('assigned_to', $userId);
    }
    
    $total = $query->countAllResults(false);
    $pending = $query->where('status', 'pending')->countAllResults(false);
    $inProgress = $query->where('status', 'in_progress')->countAllResults(false);
    $completed = $query->where('status', 'completed')->countAllResults();
    
    return [
        'total' => $total,
        'pending' => $pending,
        'inProgress' => $inProgress,
        'completed' => $completed
    ];
}

private function getAssetStats()
{
    $db = \Config\Database::connect();
    
    $total = $db->table('assets')->countAllResults(false);
    $active = $db->table('assets')->where('status', 'active')->countAllResults(false);
    $maintenance = $db->table('assets')->where('status', 'maintenance')->countAllResults();
    
    return [
        'total' => $total,
        'active' => $active,
        'maintenance' => $maintenance
    ];
}

private function getInventoryStats()
{
    $db = \Config\Database::connect();
    
    $total = $db->table('inventory')->countAllResults(false);
    $lowStock = $db->table('inventory')->where('quantity <=', 'reorder_level')->countAllResults(false);
    $outOfStock = $db->table('inventory')->where('quantity', 0)->countAllResults();
    
    return [
        'total' => $total,
        'lowStock' => $lowStock,
        'outOfStock' => $outOfStock
    ];
}

private function getProductionStats($userId, $userRole)
{
    // Implement based on your production tables
    return [
        'efficiency' => 87,
        'oee' => 82,
        'downtime' => 3.5
    ];
}
```

---

## Day 5: Testing & Verification (4 hours)

### Test Checklist

#### Backend Tests
- [ ] Login returns permissions array
- [ ] Admin gets all permissions
- [ ] Technician gets limited permissions
- [ ] Operator gets production permissions
- [ ] Dashboard endpoint returns data

#### Frontend Tests
- [ ] Login redirects to `/dashboard`
- [ ] Dashboard loads for all roles
- [ ] Widgets show based on permissions
- [ ] Admin sees all widgets
- [ ] Technician sees limited widgets
- [ ] Operator sees production widgets
- [ ] No 401 errors on API calls
- [ ] Quick actions filtered by permissions

### Testing Script

```bash
# 1. Clear browser storage
# DevTools → Application → Local Storage → Clear All

# 2. Test Admin Login
# Login with: admin / admin123
# Expected: Redirect to /dashboard
# Expected: See all widgets
# Expected: localStorage has user_permissions array

# 3. Test Technician Login
# Login with: technician / password
# Expected: Redirect to /dashboard
# Expected: See only work orders & maintenance widgets
# Expected: No production or inventory widgets

# 4. Test Operator Login
# Login with: operator / password
# Expected: Redirect to /dashboard
# Expected: See production widgets
# Expected: No work order management widgets

# 5. Check API Calls
# Open Network tab
# Verify all requests have Authorization header
# Verify no 401 errors
```

---

## Success Criteria

✅ **Backend:**
- Permissions seeded in database
- Login returns permissions array
- Dashboard endpoint returns role-specific data

✅ **Frontend:**
- Login redirects to unified dashboard
- Dashboard adapts to user permissions
- Widgets show/hide based on permissions
- No 401 errors

✅ **Testing:**
- All roles can login
- Each role sees appropriate widgets
- Permission checks work correctly

---

## Troubleshooting

### Issue: Permissions not in localStorage
**Solution:** Check backend login response, verify permissions are returned

### Issue: Dashboard not loading
**Solution:** Check browser console for errors, verify `/dashboard/page.tsx` exists

### Issue: All widgets showing for all users
**Solution:** Check `PermissionSection` components are wrapping widgets correctly

### Issue: 401 errors on API calls
**Solution:** Verify JWT token is in localStorage and being sent with requests

---

## Next Week Preview

**Week 2:** Migrate Work Orders module to unified structure

---

**Ready to begin? Start with Day 1, Task 1.1!** 🚀
