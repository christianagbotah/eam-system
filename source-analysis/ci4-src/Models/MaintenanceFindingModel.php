<?php

namespace App\Models;

use CodeIgniter\Model;

class MaintenanceFindingModel extends Model
{
    protected $table = 'maintenance_findings';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id', 'part_id', 'technician_id', 'condition', 
        'remarks', 'measurements', 'parts_replaced', 'photo_paths', 'completed_at'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function getFindingsByWorkOrder($workOrderId)
    {
        return $this->where('work_order_id', $workOrderId)->findAll();
    }
}
