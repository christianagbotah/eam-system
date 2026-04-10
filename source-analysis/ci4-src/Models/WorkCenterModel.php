<?php
namespace App\Models;
use CodeIgniter\Model;

class WorkCenterModel extends Model {
    protected $table = 'work_centers';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'department_id', 'capacity', 'unit', 'efficiency', 'utilization'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    
    public function getWithDetails() {
        return $this->select('work_centers.*, departments.name as department_name')
            ->join('departments', 'departments.id = work_centers.department_id', 'left')
            ->orderBy('work_centers.name', 'ASC')
            ->findAll();
    }
}
