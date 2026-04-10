<?php

namespace App\Models;

use CodeIgniter\Model;

class MaterialRequestModel extends Model
{
    protected $table = 'material_requests';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'request_number', 'work_order_id', 'requested_by', 'department',
        'request_type', 'priority', 'status', 'requested_date', 'required_date',
        'approved_by', 'approved_date', 'issued_by', 'issued_date',
        'rejection_reason', 'notes'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
