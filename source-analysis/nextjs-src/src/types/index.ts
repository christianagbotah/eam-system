export interface User {
  id: number
  username: string
  email: string
  full_name: string
  role: string
  status: string
}

export interface Asset {
  id: number
  equipment_code: string
  equipment_name: string
  manufacturer: string
  model: string
  status: string
}

export interface PMSchedule {
  id: number
  pm_code: string
  equipment_id: number
  equipment_name: string
  frequency: string
  next_due_date: string
  status: string
  description: string
}

export interface WorkOrder {
  id: number
  wo_number: string
  equipment_id: number
  equipment_name: string
  priority: string
  status: string
  description: string
  assigned_to: number
  assigned_to_name: string
}

export interface InventoryItem {
  id: number
  part_number: string
  part_name: string
  quantity: number
  min_quantity: number
  unit_price: number
  location: string
}

export interface Facility {
  id: number
  facility_code: string
  facility_name: string
  location: string
  status: string
}

export interface Role {
  id: number
  role_name: string
  description: string
  permissions: {
    create: boolean
    read: boolean
    update: boolean
    delete: boolean
  }
}

export interface ApiResponse<T> {
  status: 'success' | 'error'
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}

// Asset Management Interfaces
export interface Machine {
  id: number
  asset_name: string
  asset_code: string
  asset_type?: string
  machine_name: string
  machine_code?: string
  machine_category?: string
  model?: string
  manufacturer?: string
  serial_number?: string
  plant_location?: string
  department?: string
  description?: string
  operation_type?: string
  purchase_date?: string
  installation_date?: string
  warranty_expiry?: string
  machine_photo?: string
  status: 'active' | 'inactive' | 'out_of_service'
  rated_power?: string
  voltage?: string
  capacity?: string
  cycle_time?: string
  speed_throughput?: string
  criticality?: 'low' | 'medium' | 'high' | 'critical'
  maintenance_strategy?: string
  warranty_alerts?: 'yes' | 'no'
  default_technician_group?: string
  pm_frequency?: number
  usage_unit?: string
  location?: string
  assemblies_count?: number
  created_at: string
  updated_at: string
}

export interface Assembly {
  id: number
  machine_id: number
  assembly_name: string
  assembly_code?: string
  assembly_category?: string
  description?: string
  criticality?: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'inactive'
  assembly_image?: string
  parts_count?: number
  created_at: string
  updated_at: string
}

export interface Part {
  id: number
  machine_id?: number
  assembly_id?: number
  parent_part_id?: number
  part_name: string
  part_number?: string
  part_code?: string
  part_category?: string
  manufacturer?: string
  material?: string
  dimensions?: string
  expected_lifespan?: string
  spare_availability?: 'yes' | 'no'
  current_stock_qty?: number
  safety_notes?: string
  failure_modes?: string
  status: 'active' | 'inactive' | 'obsolete'
  part_image?: string
  unit_cost?: number
  description?: string
  created_at: string
  updated_at: string
}

export interface BOMEntry {
  id: number
  machine_id: number
  assembly_id?: number
  part_id?: number
  qty: number
  unit: string
  reference_location?: string
  created_at: string
}

export interface PartMedia {
  id: number
  part_id: number
  media_type: 'image' | 'diagram' | '3d_model' | 'document'
  file_path: string
  thumbnail_path?: string
  hotspot_data?: any
  created_at: string
}

export interface AssetHistory {
  id: number
  asset_type: string
  asset_id: number
  action: string
  user_id?: number
  changes: any
  created_at: string
}
