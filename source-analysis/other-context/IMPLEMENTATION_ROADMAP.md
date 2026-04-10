# 🗺️ Implementation Roadmap - Permission-Based EAM System

## Executive Summary

**Objective:** Migrate from 7 hardcoded role directories to unified permission-based architecture  
**Timeline:** 5 weeks  
**Risk Level:** Medium (with proper testing)  
**Impact:** High (70% code reduction, infinite scalability)

---

## Week 1: Foundation & Dashboard

### Day 1-2: Backend Permission Setup

#### Task 1.1: Update Backend Login Response
**File:** Backend `AuthController.php` (or equivalent)

Ensure login returns:
```json
{
  "status": "success",
  "data": {
    "token": "...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "permissions": [
        "work_orders.view",
        "work_orders.create",
        "assets.view",
        ...
      ]
    }
  }
}
```

#### Task 1.2: Create Permission Management Endpoints
```php
// Backend routes
GET  /api/v1/eam/permissions              // List all permissions
GET  /api/v1/eam/roles                    // List all roles
GET  /api/v1/eam/roles/{id}/permissions   // Get role permissions
POST /api/v1/eam/roles/{id}/permissions   // Assign permissions to role
```

### Day 3-4: Unified Dashboard

#### Task 1.3: Create Unified Dashboard
**File:** `src/app/dashboard/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import PermissionSection from '@/components/guards/PermissionSection';
import api from '@/lib/api';

// Import widgets
import WorkOrdersWidget from '@/components/dashboard/widgets/WorkOrdersWidget';
import AssetsWidget from '@/components/dashboard/widgets/AssetsWidget';
import ProductionWidget from '@/components/dashboard/widgets/ProductionWidget';
import AnalyticsWidget from '@/components/dashboard/widgets/AnalyticsWidget';
import MaintenanceWidget from '@/components/dashboard/widgets/MaintenanceWidget';
import InventoryWidget from '@/components/dashboard/widgets/InventoryWidget';

export default function UnifiedDashboard() {
  const { hasPermission, userRole, loading } = usePermissions();
  const [stats, setStats] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      fetchDashboardData();
    }
  }, [loading]);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/unified');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome to iFactory EAM</h1>
        <p className="text-blue-100">Role: {userRole}</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Work Orders Stats */}
        <PermissionSection requiredPermission="work_orders.view">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Work Orders</h3>
              <span className="text-2xl">📋</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats?.workOrders?.total || 0}</div>
            <div className="flex space-x-4 text-xs mt-2">
              <span className="text-yellow-600">⏳ {stats?.workOrders?.pending || 0} Pending</span>
              <span className="text-blue-600">🔧 {stats?.workOrders?.inProgress || 0} Active</span>
            </div>
          </div>
        </PermissionSection>

        {/* Assets Stats */}
        <PermissionSection requiredPermission="assets.view">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Assets</h3>
              <span className="text-2xl">🏭</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats?.assets?.total || 0}</div>
            <div className="flex space-x-4 text-xs mt-2">
              <span className="text-green-600">✓ {stats?.assets?.active || 0} Active</span>
              <span className="text-yellow-600">🔧 {stats?.assets?.maintenance || 0} Maint.</span>
            </div>
          </div>
        </PermissionSection>

        {/* Inventory Stats */}
        <PermissionSection requiredPermission="inventory.view">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Inventory</h3>
              <span className="text-2xl">📦</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats?.inventory?.total || 0}</div>
            <div className="flex space-x-4 text-xs mt-2">
              <span className="text-orange-600">⚠️ {stats?.inventory?.lowStock || 0} Low</span>
              <span className="text-red-600">❌ {stats?.inventory?.outOfStock || 0} Out</span>
            </div>
          </div>
        </PermissionSection>

        {/* Production Stats */}
        <PermissionSection requiredPermission="production.view">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Production</h3>
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats?.production?.efficiency || 0}%</div>
            <div className="flex space-x-4 text-xs mt-2">
              <span className="text-blue-600">OEE: {stats?.production?.oee || 0}%</span>
              <span className="text-red-600">⏱️ {stats?.production?.downtime || 0}h</span>
            </div>
          </div>
        </PermissionSection>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Orders Widget */}
        <PermissionSection requiredPermission="work_orders.view">
          <WorkOrdersWidget />
        </PermissionSection>

        {/* Assets Widget */}
        <PermissionSection requiredPermission="assets.view">
          <AssetsWidget />
        </PermissionSection>

        {/* Maintenance Widget */}
        <PermissionSection requiredPermission="maintenance.view_requests">
          <MaintenanceWidget />
        </PermissionSection>

        {/* Production Widget */}
        <PermissionSection requiredPermission="production.view">
          <ProductionWidget />
        </PermissionSection>

        {/* Inventory Widget */}
        <PermissionSection requiredPermission="inventory.view">
          <InventoryWidget />
        </PermissionSection>

        {/* Analytics Widget */}
        <PermissionSection requiredPermission="analytics.view">
          <AnalyticsWidget />
        </PermissionSection>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <PermissionSection requiredPermission="work_orders.create">
            <a href="/work-orders/create" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center">
              <div className="text-3xl mb-2">📋</div>
              <div className="font-medium text-gray-900">Create Work Order</div>
            </a>
          </PermissionSection>

          <PermissionSection requiredPermission="assets.create">
            <a href="/assets/create" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center">
              <div className="text-3xl mb-2">🏭</div>
              <div className="font-medium text-gray-900">Add Asset</div>
            </a>
          </PermissionSection>

          <PermissionSection requiredPermission="maintenance.create_requests">
            <a href="/maintenance/requests/create" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center">
              <div className="text-3xl mb-2">🔧</div>
              <div className="font-medium text-gray-900">Request Maintenance</div>
            </a>
          </PermissionSection>

          <PermissionSection requiredPermission="production.create_survey">
            <a href="/production/surveys/create" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center">
              <div className="text-3xl mb-2">📝</div>
              <div className="font-medium text-gray-900">Production Survey</div>
            </a>
          </PermissionSection>

          <PermissionSection requiredPermission="inventory.request">
            <a href="/inventory/requests/create" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center">
              <div className="text-3xl mb-2">📦</div>
              <div className="font-medium text-gray-900">Request Parts</div>
            </a>
          </PermissionSection>

          <PermissionSection requiredPermission="analytics.view">
            <a href="/analytics/kpi" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center">
              <div className="text-3xl mb-2">📈</div>
              <div className="font-medium text-gray-900">View Analytics</div>
            </a>
          </PermissionSection>

          <PermissionSection requiredPermission="reports.view">
            <a href="/reports" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center">
              <div className="text-3xl mb-2">📊</div>
              <div className="font-medium text-gray-900">Reports</div>
            </a>
          </PermissionSection>

          <PermissionSection requiredPermission="settings.view">
            <a href="/settings" className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center">
              <div className="text-3xl mb-2">⚙️</div>
              <div className="font-medium text-gray-900">Settings</div>
            </a>
          </PermissionSection>
        </div>
      </div>
    </div>
  );
}
```

#### Task 1.4: Update Login Redirect
**File:** `src/app/login/page.tsx`

Change redirect from role-based to unified:
```tsx
// OLD
const roleRoutes = {
  'admin': '/admin/dashboard',
  'technician': '/technician/dashboard',
  ...
};
router.push(roleRoutes[user.role]);

// NEW
router.push('/dashboard');
```

### Day 5: Testing
- Test login with each role
- Verify dashboard shows correct widgets
- Verify permissions are enforced

---

## Week 2: Work Orders Module

### Day 1-2: Create Unified Work Orders Page

#### Task 2.1: Create `/work-orders/page.tsx`
```tsx
'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import PermissionSection from '@/components/guards/PermissionSection';
import api from '@/lib/api';
import Link from 'next/link';

export default function WorkOrdersPage() {
  const { hasPermission, hasAnyPermission } = usePermissions();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  });

  useEffect(() => {
    fetchWorkOrders();
  }, [filters]);

  const fetchWorkOrders = async () => {
    try {
      let endpoint = '/work-orders';
      
      // Fetch based on permissions
      if (hasPermission('work_orders.view_all')) {
        endpoint = '/work-orders'; // All work orders
      } else if (hasPermission('work_orders.view_own')) {
        endpoint = '/work-orders/my'; // Only own work orders
      }
      
      const response = await api.get(endpoint, { params: filters });
      setWorkOrders(response.data.data);
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    
    try {
      await api.delete(`/work-orders/${id}`);
      fetchWorkOrders();
    } catch (error) {
      console.error('Error deleting work order:', error);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await api.post(`/work-orders/${id}/complete`);
      fetchWorkOrders();
    } catch (error) {
      console.error('Error completing work order:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
        
        <PermissionSection requiredPermission="work_orders.create">
          <Link 
            href="/work-orders/create"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Create Work Order
          </Link>
        </PermissionSection>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="px-4 py-2 border rounded-lg"
          />
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          
          <select
            value={filters.priority}
            onChange={(e) => setFilters({...filters, priority: e.target.value})}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          
          <button
            onClick={() => setFilters({ status: '', priority: '', search: '' })}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WO Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workOrders.map((wo: any) => (
              <tr key={wo.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/work-orders/${wo.id}`} className="text-blue-600 hover:text-blue-800">
                    {wo.work_order_number}
                  </Link>
                </td>
                <td className="px-6 py-4">{wo.title}</td>
                <td className="px-6 py-4">{wo.asset_name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    wo.status === 'completed' ? 'bg-green-100 text-green-800' :
                    wo.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {wo.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    wo.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    wo.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    wo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {wo.priority}
                  </span>
                </td>
                <td className="px-6 py-4">{wo.assigned_to_name || 'Unassigned'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    <Link href={`/work-orders/${wo.id}`} className="text-blue-600 hover:text-blue-800">
                      View
                    </Link>
                    
                    <PermissionSection requiredPermission="work_orders.edit">
                      <Link href={`/work-orders/${wo.id}/edit`} className="text-green-600 hover:text-green-800">
                        Edit
                      </Link>
                    </PermissionSection>
                    
                    <PermissionSection requiredPermission="work_orders.complete">
                      {wo.status === 'in_progress' && (
                        <button onClick={() => handleComplete(wo.id)} className="text-purple-600 hover:text-purple-800">
                          Complete
                        </button>
                      )}
                    </PermissionSection>
                    
                    <PermissionSection requiredPermission="work_orders.delete">
                      <button onClick={() => handleDelete(wo.id)} className="text-red-600 hover:text-red-800">
                        Delete
                      </button>
                    </PermissionSection>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Day 3: Create Work Order Detail Page
**File:** `src/app/work-orders/[id]/page.tsx`

### Day 4: Create Work Order Create/Edit Pages
**Files:** 
- `src/app/work-orders/create/page.tsx`
- `src/app/work-orders/[id]/edit/page.tsx`

### Day 5: Testing
- Test with each role
- Verify permissions work correctly
- Test CRUD operations

---

## Week 3: Assets & Maintenance Modules

### Day 1-3: Assets Module
- Create `/assets/page.tsx`
- Create `/assets/[id]/page.tsx`
- Create `/assets/create/page.tsx`
- Migrate machines, hierarchy, health pages

### Day 4-5: Maintenance Module
- Create `/maintenance/requests/page.tsx`
- Create `/maintenance/pm-schedules/page.tsx`
- Create `/maintenance/calibration/page.tsx`

---

## Week 4: Inventory, Production & Analytics

### Day 1-2: Inventory Module
- Create `/inventory/items/page.tsx`
- Create `/inventory/adjustments/page.tsx`
- Create `/inventory/requests/page.tsx`

### Day 3: Production Module
- Create `/production/surveys/page.tsx`
- Create `/production/targets/page.tsx`
- Create `/production/work-centers/page.tsx`

### Day 4-5: Analytics & Reports
- Create `/analytics/kpi/page.tsx`
- Create `/analytics/oee/page.tsx`
- Create `/reports/page.tsx`

---

## Week 5: Cleanup & Testing

### Day 1-2: Add Redirects
Create redirects from old routes to new routes:

**File:** `src/middleware.ts`
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Redirect old role-based routes to new unified routes
  const redirects: Record<string, string> = {
    '/admin/work-orders': '/work-orders',
    '/technician/my-work-orders': '/work-orders',
    '/planner/work-orders': '/work-orders',
    '/supervisor/work-orders': '/work-orders',
    '/admin/assets': '/assets',
    '/admin/inventory': '/inventory',
    '/operator/production-survey': '/production/surveys',
    // Add more redirects...
  };
  
  if (redirects[path]) {
    return NextResponse.redirect(new URL(redirects[path], request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/technician/:path*',
    '/operator/:path*',
    '/planner/:path*',
    '/supervisor/:path*',
    '/manager/:path*',
    '/shop-attendant/:path*'
  ]
};
```

### Day 3: Remove Old Folders
```bash
# Backup first
git commit -m "Backup before removing old role folders"

# Remove old folders
rm -rf src/app/admin
rm -rf src/app/technician
rm -rf src/app/operator
rm -rf src/app/planner
rm -rf src/app/supervisor
rm -rf src/app/manager
rm -rf src/app/shop-attendant
```

### Day 4-5: Comprehensive Testing
- Test all modules with all roles
- Test permission changes
- Test edge cases
- Performance testing
- User acceptance testing

---

## Success Criteria

- [ ] All users can login and see appropriate dashboard
- [ ] Navigation shows only permitted items
- [ ] All CRUD operations work with permission checks
- [ ] No 403/401 errors for permitted actions
- [ ] Proper error messages for denied actions
- [ ] All old routes redirect to new routes
- [ ] Performance is same or better
- [ ] Code coverage > 80%
- [ ] User acceptance sign-off

---

## Rollback Plan

If issues arise:
1. Revert to previous git commit
2. Restore old role-based folders
3. Remove new unified pages
4. Restore old login redirect logic

---

**Ready to begin? Start with Week 1, Day 1!**
