// Asset Management Types
export interface Machine {
  id: number;
  machine_code: string;
  machine_name: string;
  machine_category: string;
  asset_class?: 'rotating' | 'static' | 'electrical' | 'instrumentation' | 'civil';
  model?: string;
  manufacturer?: string;
  serial_number?: string;
  plant_location: string;
  functional_location?: string;
  department: string;
  cost_center?: string;
  production_line?: string;
  description?: string;
  operation_type?: 'continuous' | 'batch' | 'manual' | 'automated';
  purchase_date?: string;
  installation_date?: string;
  commissioning_date?: string;
  warranty_expiry?: string;
  warranty_type?: 'manufacturer' | 'extended' | 'service_contract' | 'none';
  service_contract_number?: string;
  service_contract_expiry?: string;
  machine_photo?: string;
  technical_manual_path?: string;
  parts_catalog_path?: string;
  drawing_number?: string;
  qr_code?: string;
  barcode?: string;
  status: 'active' | 'inactive' | 'out_of_service';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  safety_class?: 'class_1' | 'class_2' | 'class_3' | 'non_classified';
  hazardous_area_classification?: string;
  rated_power?: string;
  voltage?: string;
  capacity?: string;
  cycle_time?: string;
  speed_throughput?: string;
  operating_weight?: string;
  dimensions?: string;
  operating_temperature_range?: string;
  operating_pressure?: string;
  environmental_conditions?: string;
  acquisition_cost?: number;
  current_value?: number;
  depreciation_method?: 'straight_line' | 'declining_balance' | 'units_of_production';
  useful_life_years?: number;
  salvage_value?: number;
  mtbf_hours?: number;
  mttr_hours?: number;
  design_life_years?: number;
  oee_target?: number;
  vendor_id?: number;
  supplier_part_number?: string;
  permit_required?: 'yes' | 'no';
  lockout_tagout_required?: 'yes' | 'no';
  ppe_requirements?: string;
  regulatory_compliance?: string;
  maintenance_strategy?: 'time-based' | 'usage-based' | 'condition-based';
  warranty_alerts?: 'yes' | 'no';
  default_technician_group?: string;
  pm_frequency?: number;
  usage_unit?: 'hours' | 'cycles' | 'meters' | 'quantity_produced';
  maintenance_plan_id?: number;
  lubrication_schedule?: string;
  calibration_required?: 'yes' | 'no';
  calibration_frequency_days?: number;
  last_calibration_date?: string;
  next_calibration_date?: string;
  redundancy_available?: 'yes' | 'no';
  backup_equipment_id?: number;
  downtime_impact?: 'production_stop' | 'reduced_capacity' | 'quality_impact' | 'minimal';
  decommissioning_date?: string;
  disposal_date?: string;
  replacement_planned_date?: string;
  replacement_cost_estimate?: number;
  installation_notes?: string;
  modification_history?: string;
  special_instructions?: string;
  assemblies_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Assembly {
  id: number;
  equipment_id: number; // References machines.id
  machine_id?: number; // Frontend alias for equipment_id
  assembly_code: string;
  assembly_name: string;
  assembly_category?: string;
  description?: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive';
  assembly_image?: string;
  parts_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Part {
  id: number;
  component_id: number; // References assemblies.id
  assembly_id?: number; // Frontend alias for component_id
  parent_part_id?: number;
  part_number: string;
  part_code?: string;
  part_name: string;
  part_category?: string;
  description?: string;
  manufacturer?: string;
  material?: string;
  dimensions?: string;
  expected_lifespan?: string;
  spare_availability: 'yes' | 'no';
  current_stock_qty?: number;
  safety_notes?: string;
  failure_modes?: string;
  unit_cost?: number;
  status: 'active' | 'inactive' | 'obsolete';
  part_image?: string;
  created_at: string;
  updated_at: string;
}

export interface BOMEntry {
  id: number;
  machine_id: number;
  assembly_id?: number;
  part_id?: number;
  qty: number;
  unit: string;
  reference_location?: string;
  created_at: string;
}

export interface PartMedia {
  id: number;
  part_id: number;
  media_type: 'image' | 'diagram' | '3d_model' | 'document';
  file_path: string;
  thumbnail_path?: string;
  hotspot_data?: any;
  created_at: string;
}

export interface Meter {
  id: number;
  asset_node_type: 'machine' | 'assembly' | 'part';
  asset_node_id: number;
  meter_type: string;
  unit?: string;
  value: number;
  last_read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetHistory {
  id: number;
  asset_type: string;
  asset_id: number;
  action: string;
  user_id?: number;
  changes: any;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

// Form Data Types
export interface MachineFormData {
  machine_code?: string;
  machine_name: string;
  machine_category: string;
  asset_class?: 'rotating' | 'static' | 'electrical' | 'instrumentation' | 'civil';
  model?: string;
  manufacturer?: string;
  serial_number?: string;
  plant_location: string;
  functional_location?: string;
  department: string;
  cost_center?: string;
  production_line?: string;
  description?: string;
  operation_type?: 'continuous' | 'batch' | 'manual' | 'automated';
  purchase_date?: string;
  installation_date?: string;
  commissioning_date?: string;
  warranty_expiry?: string;
  warranty_type?: 'manufacturer' | 'extended' | 'service_contract' | 'none';
  service_contract_number?: string;
  service_contract_expiry?: string;
  machine_photo?: File | string;
  status?: 'active' | 'inactive' | 'out_of_service';
  criticality?: 'low' | 'medium' | 'high' | 'critical';
  safety_class?: 'class_1' | 'class_2' | 'class_3' | 'non_classified';
  hazardous_area_classification?: string;
  rated_power?: string;
  voltage?: string;
  capacity?: string;
  cycle_time?: string;
  speed_throughput?: string;
  operating_weight?: string;
  dimensions?: string;
  operating_temperature_range?: string;
  operating_pressure?: string;
  acquisition_cost?: number;
  current_value?: number;
  depreciation_method?: 'straight_line' | 'declining_balance' | 'units_of_production';
  useful_life_years?: number;
  salvage_value?: number;
  mtbf_hours?: number;
  mttr_hours?: number;
  design_life_years?: number;
  oee_target?: number;
  permit_required?: 'yes' | 'no';
  lockout_tagout_required?: 'yes' | 'no';
  ppe_requirements?: string;
  maintenance_strategy?: 'time-based' | 'usage-based' | 'condition-based';
  pm_frequency?: number;
  usage_unit?: 'hours' | 'cycles' | 'meters' | 'quantity_produced';
  calibration_required?: 'yes' | 'no';
  calibration_frequency_days?: number;
  redundancy_available?: 'yes' | 'no';
  downtime_impact?: 'production_stop' | 'reduced_capacity' | 'quality_impact' | 'minimal';
  replacement_planned_date?: string;
  replacement_cost_estimate?: number;
  installation_notes?: string;
  special_instructions?: string;
}

export interface AssemblyFormData {
  equipment_id: number;
  assembly_code: string;
  assembly_name: string;
  assembly_category?: string;
  description?: string;
  criticality?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'active' | 'inactive';
  assembly_image?: File | string;
}

export interface PartFormData {
  component_id: number;
  parent_part_id?: number;
  part_number: string;
  part_code?: string;
  part_name: string;
  part_category?: string;
  description?: string;
  manufacturer?: string;
  material?: string;
  dimensions?: string;
  expected_lifespan?: string;
  spare_availability?: 'yes' | 'no';
  current_stock_qty?: number;
  safety_notes?: string;
  failure_modes?: string;
  unit_cost?: number;
  status?: 'active' | 'inactive' | 'obsolete';
  part_image?: File | string;
}

export interface MeterFormData {
  asset_node_type: 'machine' | 'assembly' | 'part';
  asset_node_id: number;
  meter_type: string;
  unit?: string;
  value?: number;
}

// Filter Types
export interface AssetFilters {
  search?: string;
  status?: string;
  criticality?: string;
  category?: string;
  manufacturer?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

// Tree Node Types
export interface AssetTreeNode {
  id: number;
  type: 'machine' | 'assembly' | 'part';
  name: string;
  code?: string;
  status: string;
  criticality?: string;
  children?: AssetTreeNode[];
  parent_id?: number;
  expanded?: boolean;
}
