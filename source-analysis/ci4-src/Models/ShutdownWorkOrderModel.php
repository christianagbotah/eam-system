<?php

namespace App\Models;

use CodeIgniter\Model;

class ShutdownWorkOrderModel extends Model
{
    protected $table = 'shutdown_work_orders';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'shutdown_event_id', 'work_order_id', 'sequence_order',
        'critical_path', 'dependencies'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = null;
    protected $validationRules = [
        'shutdown_event_id' => 'required|integer',
        'work_order_id' => 'required|integer'
    ];
}
