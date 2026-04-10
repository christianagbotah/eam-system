<?php

namespace App\Models;

use CodeIgniter\Model;

class PredictiveMaintenanceInspectionModel extends Model
{
    protected $table = 'predictive_maintenance_inspections';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'asset_id', 'inspection_type', 'reading_value', 'threshold_warning',
        'threshold_critical', 'status', 'inspector_id', 'inspection_date',
        'next_inspection_date', 'notes', 'work_order_generated', 'work_order_id'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'asset_id' => 'required|integer',
        'inspection_type' => 'required|in_list[vibration,temperature,oil_analysis,visual,ultrasonic]',
        'status' => 'required|in_list[normal,warning,critical]',
        'inspector_id' => 'required|integer',
        'inspection_date' => 'required'
    ];
}
