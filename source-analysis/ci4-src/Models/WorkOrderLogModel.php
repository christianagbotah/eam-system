<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderLogModel extends Model
{
    protected $table = 'work_order_logs';
    protected $primaryKey = 'id';
    protected $allowedFields = ['work_order_id', 'user_id', 'action', 'details'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = '';
}
