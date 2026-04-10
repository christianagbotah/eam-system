// ============================================================================
// SHARED TYPESCRIPT TYPES FOR EAM SYSTEM
// ============================================================================

// User & Auth
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar?: string;
  phone?: string;
  departmentId?: string;
  supervisorId?: string;
  plantId?: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined
  department?: Department;
  plant?: Plant;
  roles?: Role[];
  permissions?: string[];
  plantAccess?: Plant[];
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  level: number;
  isSystem: boolean;
  color?: string;
  permissionCount?: number;
}

export interface Permission {
  id: string;
  slug: string;
  name: string;
  module: string;
  action: string;
  description?: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  role: Role;
}

// Organization
export interface Plant {
  id: string;
  code: string;
  name: string;
  location?: string;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  level: number;
  isActive: boolean;
}

// Modules
export interface Module {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  version: string;
  isCore: boolean;
  isActive: boolean;
  sortOrder: number;
  routePath?: string;
  isEnabled?: boolean; // company activation
}

// Maintenance Requests
export interface MaintenanceRequest {
  id: string;
  requestNumber: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  machineDown: boolean;
  assetId?: string;
  assetName?: string;
  location?: string;
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  workflowStatus: string;
  category?: string;
  requestedById: string;
  supervisorId?: string;
  approvedById?: string;
  approvedAt?: string;
  reviewNotes?: string;
  plannerId?: string;
  workOrderId?: string;
  createdAt: string;
  updatedAt: string;
  // Joined
  requester?: { id: string; fullName: string; username: string };
  reviewer?: { id: string; fullName: string; username: string };
  comments?: MRComment[];
  statusHistory?: MRStatusHistory[];
  workOrder?: { id: string; woNumber: string; title: string; status: string };
}

export interface MRComment {
  id: string;
  maintenanceRequestId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: { id: string; fullName: string };
}

export interface MRStatusHistory {
  id: string;
  maintenanceRequestId: string;
  fromStatus?: string;
  toStatus: string;
  changedById?: string;
  reason?: string;
  createdAt: string;
  changedBy?: { id: string; fullName: string };
}

// Work Orders
export interface WorkOrder {
  id: string;
  woNumber: string;
  title: string;
  description?: string;
  type: 'preventive' | 'corrective' | 'predictive' | 'inspection' | 'emergency' | 'project';
  priority: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  status: 'draft' | 'requested' | 'approved' | 'planned' | 'assigned' | 'in_progress' | 'waiting_parts' | 'on_hold' | 'completed' | 'verified' | 'closed' | 'cancelled';
  assetId?: string;
  assetName?: string;
  departmentId?: string;
  requestId?: string;
  assignedToId?: string;
  assignedToName?: string;
  teamLeaderId?: string;
  supervisorId?: string;
  plannerId?: string;
  assignedById?: string;
  assignedAt?: string;
  assignmentType?: string;
  estimatedHours?: number;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  actualHours?: number;
  totalCost: number;
  materialCost: number;
  laborCost: number;
  slaHours?: number;
  slaStartedAt?: string;
  slaBreached: boolean;
  responseDue?: string;
  resolutionDue?: string;
  failureDescription?: string;
  causeDescription?: string;
  actionDescription?: string;
  isLocked: boolean;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  // Joined
  teamMembers?: WOTeamMember[];
  timeLogs?: WOTimeLog[];
  materials?: WOMaterial[];
  comments?: WOComment[];
  statusHistory?: WOStatusHistory[];
  creator?: { id: string; fullName: string };
  request?: {
    id: string;
    requestNumber: string;
    title: string;
    requester?: { id: string; fullName: string };
  };
}

export interface WOTeamMember {
  id: string;
  workOrderId: string;
  userId?: string;
  userName?: string;
  role: string;
  hours?: number;
  createdAt: string;
}

export interface WOTimeLog {
  id: string;
  workOrderId: string;
  userId?: string;
  userName?: string;
  action: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  note?: string;
  createdAt: string;
}

export interface WOMaterial {
  id: string;
  workOrderId: string;
  itemName?: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  totalCost?: number;
  status: string;
  createdAt: string;
}

export interface WOComment {
  id: string;
  workOrderId: string;
  userId?: string;
  userName?: string;
  content: string;
  createdAt: string;
}

export interface WOStatusHistory {
  id: string;
  workOrderId: string;
  fromStatus?: string;
  toStatus: string;
  changedById?: string;
  changedByName?: string;
  reason?: string;
  createdAt: string;
}

// Dashboard
export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  pendingApprovals: number;
  approvedRequests: number;
  rejectedRequests: number;
  convertedRequests: number;
  totalWorkOrders: number;
  activeWorkOrders: number;
  completedWorkOrders: number;
  overdueWorkOrders: number;
  createdTodayMR: number;
  createdTodayWO: number;
  completedTodayWO: number;
  pendingMR: number;
  inProgressMR: number;
  approvedMR: number;
  rejectedMR: number;
  convertedMR: number;
  draftWO: number;
  requestedWO: number;
  approvedWO: number;
  assignedWO: number;
  inProgressWO: number;
  completedWO: number;
  closedWO: number;
  preventiveWO: number;
  correctiveWO: number;
  emergencyWO: number;
  inspectionWO: number;
  predictiveWO: number;
  highPriorityMR: number;
  mediumPriorityMR: number;
  lowPriorityMR: number;
  recentRequests: MaintenanceRequest[];
  recentWorkOrders: WorkOrder[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

// Asset Categories & Assets
export interface AssetCategory { id: string; name: string; code: string; description?: string; parentId?: string; isActive: boolean; createdAt: string; updatedAt: string; parent?: AssetCategory; children?: AssetCategory[]; _count?: { assets: number }; }

export interface Asset { id: string; name: string; assetTag: string; description?: string; categoryId?: string; serialNumber?: string; manufacturer?: string; model?: string; yearManufactured?: number; condition: string; status: string; criticality: string; location?: string; building?: string; floor?: string; area?: string; plantId?: string; departmentId?: string; purchaseDate?: string; purchaseCost?: number; warrantyExpiry?: string; installedDate?: string; expectedLifeYears?: number; currentValue?: number; depreciationRate?: number; imageUrl?: string; parentId?: string; isActive: boolean; createdById?: string; assignedToId?: string; createdAt: string; updatedAt: string; category?: AssetCategory; plant?: { id: string; name: string; code: string }; department?: { id: string; name: string; code: string }; assignedTo?: { id: string; fullName: string; username: string }[]; pmSchedules?: any[]; }

export interface InventoryItem { id: string; itemCode: string; name: string; description?: string; category: string; unitOfMeasure: string; currentStock: number; minStockLevel: number; maxStockLevel?: number; reorderQuantity?: number; unitCost?: number; supplier?: string; supplierPartNumber?: string; location?: string; binLocation?: string; shelfLocation?: string; plantId?: string; isActive: boolean; createdById?: string; createdAt: string; updatedAt: string; plant?: { id: string; name: string }; stockMovements?: any[]; }

export interface PmSchedule { id: string; title: string; description?: string; assetId: string; frequencyType: string; frequencyValue: number; lastCompletedDate?: string; nextDueDate?: string; estimatedDuration?: number; priority: string; assignedToId?: string; departmentId?: string; isActive: boolean; autoGenerateWO: boolean; leadDays: number; createdById?: string; createdAt: string; updatedAt: string; asset?: Asset; assignedTo?: { id: string; fullName: string; username: string }[]; }

// Company Profile
export interface CompanyProfile {
  id: string;
  companyName: string;
  tradingName?: string;
  logo?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  industry?: string;
  employeeCount?: string;
  fiscalYearStart?: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  isSetupComplete: boolean;
  setupCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Navigation
export type PageName =
  | 'dashboard'
  | 'maintenance-requests'
  | 'mr-detail'
  | 'create-mr'
  | 'work-orders'
  | 'wo-detail'
  | 'assets'
  | 'asset-detail'
  | 'inventory'
  | 'pm-schedules'
  | 'reports'
  | 'analytics'
  | 'notifications'
  | 'settings-users'
  | 'settings-roles'
  | 'settings-modules'
  | 'settings-company'
  | 'settings-plants'
  | 'settings-departments'
  | 'settings-audit';
