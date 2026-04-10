<?php

namespace App\Models;

use CodeIgniter\Model;

class AssetUnifiedModel extends Model
{
    protected $table = 'assets_unified';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'asset_code', 'asset_name', 'asset_type', 'parent_id', 'hierarchy_level',
        'hierarchy_path', 'manufacturer', 'model_number', 'serial_number',
        'installation_date', 'status', 'criticality', 'health_score',
        'location_id', 'department_id', 'mtbf_hours', 'mttr_hours', 'oee_percent',
        'acquisition_cost', 'model_3d_id', 'tags', 'custom_fields', 'created_by'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'asset_code' => 'required|is_unique[assets_unified.asset_code,id,{id}]',
        'asset_name' => 'required|min_length[3]',
        'asset_type' => 'required',
        'status' => 'required',
        'criticality' => 'required'
    ];
}
