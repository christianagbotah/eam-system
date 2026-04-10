// Access Control List (ACL) for frontend permission management
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  permissions?: string[];
}

export interface Permission {
  [key: string]: string;
}

export const PERMISSIONS: Permission = {
  // Assets
  'assets.view': 'View assets',
  'assets.create': 'Create assets',
  'assets.update': 'Update assets',
  'assets.delete': 'Delete assets',
  
  // Work Orders
  'workorders.view': 'View work orders',
  'workorders.create': 'Create work orders',
  'workorders.update': 'Update work orders',
  'workorders.delete': 'Delete work orders',
  'workorders.assign': 'Assign work orders',
  'workorders.approve': 'Approve work orders',
  'workorders.close': 'Close work orders',
  
  // PM Schedules
  'pm.view': 'View PM schedules',
  'pm.create': 'Create PM schedules',
  'pm.update': 'Update PM schedules',
  'pm.delete': 'Delete PM schedules',
  'pm.execute': 'Execute PM tasks',
  
  // BOM
  'bom.view': 'View BOM',
  'bom.create': 'Create BOM',
  'bom.update': 'Update BOM',
  'bom.delete': 'Delete BOM',
  'bom.export': 'Export BOM',
  
  // Calibration
  'calibration.view': 'View calibration',
  'calibration.create': 'Create calibration',
  'calibration.update': 'Update calibration',
  'calibration.delete': 'Delete calibration',
  
  // Downtime
  'downtime.view': 'View downtime',
  'downtime.create': 'Create downtime',
  'downtime.update': 'Update downtime',
  'downtime.delete': 'Delete downtime',
  
  // OEE
  'oee.view': 'View OEE',
  'oee.manage': 'Manage OEE',
  
  // Meters
  'meters.view': 'View meters',
  'meters.create': 'Create meters',
  'meters.update': 'Update meters',
  'meters.delete': 'Delete meters',
  
  // Training
  'training.view': 'View training',
  'training.create': 'Create training',
  'training.update': 'Update training',
  'training.delete': 'Delete training',
  'training.approve': 'Approve training',
  
  // Risk Assessment
  'risk.view': 'View risk',
  'risk.create': 'Create risk',
  'risk.update': 'Update risk',
  'risk.delete': 'Delete risk',
  
  // Work Centers
  'workcenters.view': 'View work centers',
  'workcenters.create': 'Create work centers',
  'workcenters.update': 'Update work centers',
  'workcenters.delete': 'Delete work centers',
  
  // Resources
  'resources.view': 'View resources',
  'resources.create': 'Create resources',
  'resources.update': 'Update resources',
  'resources.delete': 'Delete resources',
  'resources.allocate': 'Allocate resources',
  
  // RCA
  'rca.view': 'View failure reports',
  'rca.create': 'Create failure reports',
  'rca.update': 'Update failure reports',
  'rca.delete': 'Delete failure reports',
  'rca.analyze': 'Perform RCA',
  'rca.approve': 'Approve CAPA',
  
  // Reports
  'reports.view': 'View reports',
  'reports.export': 'Export reports',
  'reports.create': 'Create reports',
  
  // IoT
  'iot.view': 'View IoT',
  'iot.manage': 'Manage IoT',
  
  // Inventory
  'inventory.view': 'View inventory',
  'inventory.create': 'Create inventory',
  'inventory.update': 'Update inventory',
  'inventory.delete': 'Delete inventory',
  'inventory.request': 'Request parts',
  'inventory.approve': 'Approve requests',
  
  // System
  'users.view': 'View users',
  'users.create': 'Create users',
  'users.update': 'Update users',
  'users.delete': 'Delete users',
  'system.configure': 'Configure system'
};

export const ROLE_PERMISSIONS: { [role: string]: string[] } = {
  admin: [
    // Full access to all modules
    'assets.view', 'assets.create', 'assets.update', 'assets.delete',
    'workorders.view', 'workorders.create', 'workorders.update', 'workorders.delete', 'workorders.assign', 'workorders.approve', 'workorders.close',
    'pm.view', 'pm.create', 'pm.update', 'pm.delete', 'pm.execute',
    'bom.view', 'bom.create', 'bom.update', 'bom.delete', 'bom.export',
    'calibration.view', 'calibration.create', 'calibration.update', 'calibration.delete',
    'downtime.view', 'downtime.create', 'downtime.update', 'downtime.delete',
    'oee.view', 'oee.manage',
    'meters.view', 'meters.create', 'meters.update', 'meters.delete',
    'training.view', 'training.create', 'training.update', 'training.delete', 'training.approve',
    'risk.view', 'risk.create', 'risk.update', 'risk.delete',
    'workcenters.view', 'workcenters.create', 'workcenters.update', 'workcenters.delete',
    'resources.view', 'resources.create', 'resources.update', 'resources.delete', 'resources.allocate',
    'rca.view', 'rca.create', 'rca.update', 'rca.delete', 'rca.analyze', 'rca.approve',
    'reports.view', 'reports.export', 'reports.create',
    'iot.view', 'iot.manage',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.request', 'inventory.approve',
    'users.view', 'users.create', 'users.update', 'users.delete',
    'system.configure'
  ],
  manager: [
    // Strategic + Operational oversight
    'assets.view', 'assets.update',
    'workorders.view', 'workorders.create', 'workorders.update', 'workorders.delete', 'workorders.assign', 'workorders.approve', 'workorders.close',
    'pm.view', 'pm.create', 'pm.update',
    'bom.view', 'bom.create', 'bom.update', 'bom.delete', 'bom.export',
    'calibration.view', 'calibration.create', 'calibration.update', 'calibration.delete',
    'downtime.view', 'downtime.update',
    'oee.view',
    'meters.view',
    'training.view', 'training.create', 'training.update', 'training.delete', 'training.approve',
    'risk.view', 'risk.create', 'risk.update', 'risk.delete',
    'workcenters.view', 'workcenters.create', 'workcenters.update', 'workcenters.delete',
    'resources.view', 'resources.create', 'resources.update', 'resources.delete', 'resources.allocate',
    'rca.view', 'rca.create', 'rca.update', 'rca.delete', 'rca.analyze', 'rca.approve',
    'reports.view', 'reports.export', 'reports.create',
    'iot.view',
    'inventory.view', 'inventory.approve'
  ],
  planner: [
    // Planning & Scheduling
    'assets.view',
    'workorders.view', 'workorders.create', 'workorders.update', 'workorders.assign',
    'pm.view', 'pm.create', 'pm.update', 'pm.delete', 'pm.execute',
    'bom.view', 'bom.export',
    'calibration.view', 'calibration.create', 'calibration.update',
    'downtime.view',
    'oee.view',
    'meters.view',
    'training.view', 'training.create', 'training.update',
    'risk.view', 'risk.create', 'risk.update',
    'workcenters.view', 'workcenters.update',
    'resources.view', 'resources.create', 'resources.update', 'resources.delete', 'resources.allocate',
    'rca.view', 'rca.create', 'rca.update', 'rca.analyze',
    'reports.view', 'reports.export',
    'iot.view',
    'inventory.view', 'inventory.request'
  ],
  supervisor: [
    // Execution + Team oversight
    'assets.view',
    'workorders.view', 'workorders.update', 'workorders.assign', 'workorders.close',
    'pm.view', 'pm.execute',
    'bom.view',
    'calibration.view',
    'downtime.view', 'downtime.create', 'downtime.update', 'downtime.delete',
    'oee.view',
    'meters.view', 'meters.create', 'meters.update',
    'training.view', 'training.update',
    'risk.view',
    'workcenters.view',
    'resources.view',
    'rca.view', 'rca.create', 'rca.update',
    'reports.view',
    'iot.view',
    'inventory.view', 'inventory.request'
  ],
  technician: [
    // Work execution
    'assets.view',
    'workorders.view', 'workorders.update',
    'pm.view', 'pm.execute',
    'bom.view',
    'calibration.view',
    'downtime.create',
    'oee.view',
    'meters.view', 'meters.create',
    'training.view',
    'risk.view',
    'workcenters.view',
    'resources.view',
    'rca.view', 'rca.create',
    'reports.view',
    'iot.view',
    'inventory.view', 'inventory.request'
  ],
  operator: [
    // Production operations
    'assets.view',
    'workorders.view',
    'pm.view',
    'downtime.create',
    'oee.view',
    'meters.view', 'meters.create',
    'training.view',
    'reports.view'
  ],
  shop_attendant: [
    // Inventory management
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.request', 'inventory.approve',
    'workorders.view',
    'assets.view',
    'reports.view'
  ]
};

export class ACL {
  private user: User | null = null;

  setUser(user: User | null): void {
    this.user = user;
  }

  getUser(): User | null {
    return this.user;
  }

  can(permission: string): boolean {
    if (!this.user) {
      return false;
    }

    // Check if user has explicit permissions array
    if (this.user.permissions) {
      return this.user.permissions.includes(permission);
    }

    // Fall back to role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[this.user.role] || [];
    return rolePermissions.includes(permission);
  }

  cannot(permission: string): boolean {
    return !this.can(permission);
  }

  hasRole(role: string): boolean {
    return this.user?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    return this.user ? roles.includes(this.user.role) : false;
  }

  getUserPermissions(): string[] {
    if (!this.user) {
      return [];
    }

    if (this.user.permissions) {
      return this.user.permissions;
    }

    return ROLE_PERMISSIONS[this.user.role] || [];
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isManager(): boolean {
    return this.hasRole('manager');
  }

  isSupervisor(): boolean {
    return this.hasRole('supervisor');
  }

  isTechnician(): boolean {
    return this.hasRole('technician');
  }

  isOperator(): boolean {
    return this.hasRole('operator');
  }

  isPlanner(): boolean {
    return this.hasRole('planner');
  }

  isShopAttendant(): boolean {
    return this.hasRole('shop_attendant');
  }
}

// Global ACL instance
export const acl = new ACL();
