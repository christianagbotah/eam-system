<?php

namespace App\Models;

class MachineModel extends PlantScopedModel
{
    protected $table = 'machines';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'plant_id', 'facility_id',
        'machine_name', 'machine_code', 'machine_category', 'asset_class', 'model', 'manufacturer', 
        'serial_number', 'plant_location', 'functional_location', 'department', 'cost_center', 'production_line',
        'description', 'operation_type', 'purchase_date', 'installation_date', 'commissioning_date',
        'warranty_expiry', 'warranty_type', 'service_contract_number', 'service_contract_expiry',
        'machine_photo', 'technical_manual_path', 'parts_catalog_path', 'drawing_number', 'qr_code', 'barcode',
        'status', 'criticality', 'safety_class', 'hazardous_area_classification',
        'rated_power', 'voltage', 'capacity', 'cycle_time', 'speed_throughput',
        'operating_weight', 'dimensions', 'operating_temperature_range', 'operating_pressure', 'environmental_conditions',
        'acquisition_cost', 'current_value', 'depreciation_method', 'useful_life_years', 'salvage_value',
        'mtbf_hours', 'mttr_hours', 'design_life_years', 'oee_target',
        'vendor_id', 'supplier_part_number', 'permit_required', 'lockout_tagout_required', 'ppe_requirements', 'regulatory_compliance',
        'maintenance_strategy', 'warranty_alerts', 'default_technician_group', 'pm_frequency', 'usage_unit',
        'maintenance_plan_id', 'lubrication_schedule', 'calibration_required', 'calibration_frequency_days',
        'last_calibration_date', 'next_calibration_date', 'redundancy_available', 'backup_equipment_id', 'downtime_impact',
        'decommissioning_date', 'disposal_date', 'replacement_planned_date', 'replacement_cost_estimate',
        'installation_notes', 'modification_history', 'special_instructions'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $deletedField = 'deleted_at';

    protected $validationRules = [
        'machine_name' => 'required|min_length[3]|max_length[255]',
        'machine_code' => 'required|min_length[3]|max_length[50]|is_unique[machines.machine_code,id,{id}]',
        'machine_category' => 'required',
        'plant_location' => 'required',
        'department' => 'required',
        'status' => 'required|in_list[active,inactive,out_of_service]',
        'criticality' => 'required|in_list[low,medium,high,critical]',
        'acquisition_cost' => 'permit_empty|decimal|greater_than_equal_to[0]',
        'mtbf_hours' => 'permit_empty|decimal|greater_than[0]',
        'mttr_hours' => 'permit_empty|decimal|greater_than[0]',
        'oee_target' => 'permit_empty|decimal|greater_than[0]|less_than_equal_to[100]'
    ];
    protected $validationMessages = [
        'machine_name' => [
            'required' => 'Machine name is required',
            'min_length' => 'Machine name must be at least 3 characters'
        ],
        'machine_code' => [
            'required' => 'Machine code is required',
            'is_unique' => 'Machine code already exists'
        ]
    ];
    protected $skipValidation = false;
    protected $cleanValidationRules = true;
}
