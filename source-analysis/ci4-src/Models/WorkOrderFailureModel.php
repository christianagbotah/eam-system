<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderFailureModel extends Model
{
    protected $table = 'work_order_failures';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'work_order_id',
        'failure_code_id',
        'failure_description',
        'root_cause',
        'remedy_action',
        'recorded_by',
        'recorded_at'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'failure_code_id' => 'required|integer',
        'failure_description' => 'required',
        'recorded_by' => 'required|integer'
    ];

    public function getByWorkOrder($workOrderId)
    {
        return $this->select('work_order_failures.*, failure_codes.code, failure_codes.description as code_description, failure_codes.category, failure_codes.severity')
            ->join('failure_codes', 'failure_codes.id = work_order_failures.failure_code_id')
            ->where('work_order_id', $workOrderId)
            ->findAll();
    }
}
