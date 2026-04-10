<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderJobPlanModel extends Model
{
    protected $table = 'work_order_job_plans';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id', 'plan_name', 'estimated_duration', 'required_skills',
        'required_tools', 'required_parts', 'safety_requirements',
        'step_by_step_instructions', 'permits_required', 'special_instructions',
        'created_by', 'approved_by', 'approved_at', 'status'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'created_by' => 'required|integer'
    ];
}
