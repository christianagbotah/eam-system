// Enterprise-grade Role-Based Access Control

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  PLANNER: 'planner',
  SUPERVISOR: 'supervisor',
  TECHNICIAN: 'technician',
  OPERATOR: 'operator',
  SHOP_ATTENDANT: 'shop_attendant'
};

export const PERMISSIONS = {
  // Core EAM
  assets: { admin: 'full', manager: 'full', planner: 'view', supervisor: 'view', technician: 'view', operator: 'view' },
  maintenance_requests: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'full', technician: 'create', operator: 'create' },
  work_orders: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'assigned', technician: 'assigned' },
  pm_schedules: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view', technician: 'view' },
  
  // Advanced Features
  bom: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view', technician: 'view' },
  calibration: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view', technician: 'view' },
  downtime: { admin: 'full', manager: 'full', planner: 'view', supervisor: 'full', technician: 'create', operator: 'create' },
  oee: { admin: 'full', manager: 'full', planner: 'view', supervisor: 'full', technician: 'view', operator: 'view' },
  meter_readings: { admin: 'full', manager: 'full', planner: 'view', supervisor: 'full', technician: 'full', operator: 'full' },
  training: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'team', technician: 'own', operator: 'own' },
  risk_assessment: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view', technician: 'view' },
  work_centers: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view', technician: 'view' },
  resources: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view', technician: 'view' },
  
  // Failure Analysis & RCA
  failure_analysis: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'full', technician: 'create' },
  rca_analysis: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'full', technician: 'view' },
  capa: { admin: 'full', manager: 'approve', planner: 'full', supervisor: 'create', technician: 'view' },
  
  // Inventory & Parts
  inventory: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'request', technician: 'request', shop_attendant: 'full' },
  parts: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view', technician: 'view', shop_attendant: 'view' },
  material_requests: { admin: 'full', manager: 'approve', planner: 'view', supervisor: 'approve', technician: 'create', shop_attendant: 'issue' },
  vendors: { admin: 'full', manager: 'full', planner: 'view', supervisor: 'view', shop_attendant: 'view' },
  
  // Reports & Analytics
  reports: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view', technician: 'view' },
  analytics: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view' },
  iot_sensors: { admin: 'full', manager: 'view', planner: 'view', supervisor: 'view', technician: 'view' },
  
  // New Modules
  condition_monitoring: { admin: 'full', manager: 'full', planner: 'view', supervisor: 'full', technician: 'create' },
  mobile_work_orders: { admin: 'full', manager: 'view', planner: 'view', supervisor: 'view', technician: 'full' },
  parts_optimization: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view', shop_attendant: 'view' },
  rcm: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view' },
  backlog_management: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view' },
  kpi_dashboard: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view' },
  notifications: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'full', technician: 'view', operator: 'view', shop_attendant: 'view' },
  resource_planning: { admin: 'full', manager: 'full', planner: 'full', supervisor: 'view' }
};

export const hasPermission = (role: string, module: string, action: string = 'view'): boolean => {
  if (!PERMISSIONS[module] || !PERMISSIONS[module][role]) return false;
  
  const permission = PERMISSIONS[module][role];
  if (permission === 'full') return true;
  if (permission === action) return true;
  if (permission === 'view' && action === 'view') return true;
  
  return false;
};

export const canAccessModule = (role: string, module: string): boolean => {
  return PERMISSIONS[module]?.[role] !== undefined;
};

export const getModulePermission = (role: string, module: string): string | null => {
  return PERMISSIONS[module]?.[role] || null;
};
