<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderLaborEnhancedModel extends Model
{
    protected $table = 'work_order_labor_enhanced';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'work_order_id', 'technician_id', 'labor_type', 'start_time', 'end_time',
        'hours_worked', 'base_rate', 'multiplier', 'total_cost',
        'justification', 'approved_by', 'approved_at'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'technician_id' => 'required|integer',
        'labor_type' => 'required|in_list[normal,overtime,weekend,holiday,emergency]',
        'start_time' => 'required',
        'base_rate' => 'required|decimal'
    ];
    
    protected $beforeInsert = ['calculateCost'];
    protected $beforeUpdate = ['calculateCost'];
    
    protected function calculateCost(array $data)
    {
        if (isset($data['data']['hours_worked'], $data['data']['base_rate'], $data['data']['multiplier'])) {
            $data['data']['total_cost'] = $data['data']['hours_worked'] * $data['data']['base_rate'] * $data['data']['multiplier'];
        }
        return $data;
    }
}
