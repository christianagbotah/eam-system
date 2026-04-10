/**
 * Enterprise RBAC Permissions Utility
 * Aligned with backend permissions configuration
 */

const rolePermissions: Record<string, string[]> = {
  admin: ['view', 'create', 'update', 'delete', 'approve', 'configure'],
  manager: ['view', 'create', 'update', 'delete', 'approve'],
  planner: ['view', 'create', 'update', 'delete'],
  supervisor: ['view', 'create', 'update', 'assign', 'close'],
  technician: ['view', 'update', 'execute'],
  operator: ['view', 'create'],
  shop_attendant: ['view', 'create', 'update', 'delete'],
}

export const hasPermission = (role: string, action: string): boolean => {
  return rolePermissions[role]?.includes(action) || false
}

/**
 * Check if role has access to specific module
 */
export const hasModuleAccess = (role: string, module: string): boolean => {
  const moduleAccess: Record<string, string[]> = {
    admin: ['all'],
    manager: ['assets', 'workorders', 'pm', 'bom', 'calibration', 'downtime', 'oee', 'meters', 'training', 'risk', 'workcenters', 'resources', 'rca', 'reports', 'iot', 'inventory'],
    planner: ['assets', 'workorders', 'pm', 'bom', 'calibration', 'downtime', 'oee', 'meters', 'training', 'risk', 'workcenters', 'resources', 'rca', 'reports', 'iot', 'inventory'],
    supervisor: ['assets', 'workorders', 'pm', 'bom', 'calibration', 'downtime', 'oee', 'meters', 'training', 'risk', 'workcenters', 'resources', 'rca', 'reports', 'iot', 'inventory'],
    technician: ['assets', 'workorders', 'pm', 'bom', 'calibration', 'downtime', 'oee', 'meters', 'training', 'risk', 'workcenters', 'resources', 'rca', 'reports', 'iot', 'inventory'],
    operator: ['assets', 'workorders', 'pm', 'downtime', 'oee', 'meters', 'training', 'reports'],
    shop_attendant: ['inventory', 'workorders', 'assets', 'reports'],
  }
  
  const access = moduleAccess[role] || []
  return access.includes('all') || access.includes(module)
}
