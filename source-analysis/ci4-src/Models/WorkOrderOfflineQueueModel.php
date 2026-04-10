<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderOfflineQueueModel extends Model
{
    protected $table = 'work_order_offline_queue';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'work_order_id', 'technician_id', 'action_type', 'offline_data',
        'device_id', 'offline_timestamp', 'synced', 'synced_at', 'sync_error'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'technician_id' => 'required|integer',
        'action_type' => 'required|in_list[start,pause,resume,update,complete]',
        'offline_data' => 'required'
    ];
}
