'use client';

import { useAuthStore } from '@/stores/authStore';

export function usePermissions() {
  const { permissions, hasPermission, hasAnyPermission, isAdmin } = useAuthStore();

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    isAdmin,
    canViewDashboard: hasPermission('dashboard.view'),
    canViewMaintenanceRequests: hasPermission('maintenance_requests.view'),
    canCreateMaintenanceRequests: hasPermission('maintenance_requests.create'),
    canApproveMaintenanceRequests: hasPermission('maintenance_requests.approve'),
    canConvertMaintenanceRequests: hasPermission('maintenance_requests.convert'),
    canViewWorkOrders: hasPermission('work_orders.view'),
    canCreateWorkOrders: hasPermission('work_orders.create'),
    canApproveWorkOrders: hasPermission('work_orders.approve'),
    canAssignWorkOrders: hasPermission('work_orders.assign'),
    canExecuteWorkOrders: hasPermission('work_orders.execute'),
    canCompleteWorkOrders: hasPermission('work_orders.complete'),
    canVerifyWorkOrders: hasPermission('work_orders.verify'),
    canCloseWorkOrders: hasPermission('work_orders.close'),
    canViewUsers: hasPermission('users.view'),
    canCreateUsers: hasPermission('users.create'),
    canManageRoles: hasPermission('roles.view'),
    canManageModules: hasPermission('modules.manage'),
    canActivateModules: hasPermission('modules.activate'),
    canViewAssets: hasPermission('assets.view'),
    canViewInventory: hasPermission('inventory.view'),
    canViewAnalytics: hasPermission('analytics.view'),
    canViewProduction: hasPermission('production.view'),
  };
}
