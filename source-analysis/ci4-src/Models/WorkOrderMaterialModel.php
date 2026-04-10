<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderMaterialModel extends Model
{
    protected $table = 'work_order_materials';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id', 'date', 'time', 'gt_code', 'description', 'specification',
        'quantity_issued', 'remarks', 'receiver_signature', 'store_clerk_signature'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
