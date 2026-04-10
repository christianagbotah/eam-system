<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderResourceReservationModel extends Model
{
    protected $table = 'work_order_resource_reservations';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id', 'resource_type', 'resource_id', 'quantity',
        'reserved_by', 'reserved_at', 'released_at', 'status', 'notes'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'resource_type' => 'required|in_list[part,tool,equipment]',
        'resource_id' => 'required|integer',
        'quantity' => 'required|integer',
        'reserved_by' => 'required|integer'
    ];
}
