<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderStatusHistoryModel extends Model
{
    protected $table = 'work_order_status_history';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id', 'from_status', 'to_status', 'changed_by', 'changed_at', 'reason'
    ];
    protected $useTimestamps = false;
    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'to_status' => 'required|string',
        'changed_by' => 'required|integer'
    ];
}
