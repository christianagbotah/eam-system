<?php

namespace App\Models;

use CodeIgniter\Model;

class OperatorProductionDataModel extends Model
{
    protected $table = 'operator_production_data';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'target_id', 'operator_id', 'shift', 'entry_date',
        'break_mins', 'repair_maint_mins', 'input_delivery_mins',
        'change_over_mins', 'startup_mins', 'cleaning_mins',
        'others_mins', 'preventive_maint_mins', 'total_downtime_mins',
        'production_yards', 'productive_time_mins', 'utilization_actual',
        'speed_actual', 'productivity', 'efficiency'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $deletedField = 'deleted_at';
    protected $validationRules = [
        'target_id' => 'required|integer',
        'operator_id' => 'required|integer',
        'shift' => 'required|in_list[Morning,Afternoon,Night]',
        'entry_date' => 'required|valid_date'
    ];

    protected $beforeInsert = ['calculateMetrics'];
    protected $beforeUpdate = ['calculateMetrics'];

    protected function calculateMetrics(array $data)
    {
        if (isset($data['data'])) {
            $d = &$data['data'];
            
            // Calculate total downtime (Column O)
            $d['total_downtime_mins'] = 
                ($d['break_mins'] ?? 0) +
                ($d['repair_maint_mins'] ?? 0) +
                ($d['input_delivery_mins'] ?? 0) +
                ($d['change_over_mins'] ?? 0) +
                ($d['startup_mins'] ?? 0) +
                ($d['cleaning_mins'] ?? 0) +
                ($d['others_mins'] ?? 0) +
                ($d['preventive_maint_mins'] ?? 0);
        }
        
        return $data;
    }
}
