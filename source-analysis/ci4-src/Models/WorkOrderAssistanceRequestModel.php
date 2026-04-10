<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderAssistanceRequestModel extends Model
{
    protected $table = 'work_order_assistance_requests';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id', 'requested_by', 'requested_at', 'skill_required',
        'reason', 'urgency', 'status', 'approved_by', 'approved_at',
        'assigned_technician_id', 'fulfilled_at', 'rejection_reason'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'requested_by' => 'required|integer',
        'reason' => 'required|string',
        'urgency' => 'in_list[low,medium,high]'
    ];
}
