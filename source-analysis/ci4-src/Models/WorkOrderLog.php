<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderLog extends Model
{
    protected $table = 'work_order_logs';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'work_order_id', 'user_id', 'action', 'old_status', 
        'new_status', 'notes'
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = false;

    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'action' => 'required|max_length[50]'
    ];

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class, 'work_order_id');
    }

    public function user()
    {
        return $this->belongsTo('App\Models\User', 'user_id');
    }
}