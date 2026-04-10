<?php
namespace App\Models;
use CodeIgniter\Model;

class ShiftAssignmentModel extends Model {
    protected $table = 'shift_assignments';
    protected $primaryKey = 'id';
    protected $allowedFields = ['user_id', 'shift_id', 'department_id', 'machine_id', 'start_date', 'end_date'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    
    public function getWithDetails($filters = []) {
        $builder = $this->select('shift_assignments.*, users.username, users.email, shifts.name as shift_name, shifts.start_time, shifts.end_time, departments.name as department_name, machines.machine_name')
            ->join('users', 'users.id = shift_assignments.user_id', 'left')
            ->join('shifts', 'shifts.id = shift_assignments.shift_id', 'left')
            ->join('departments', 'departments.id = shift_assignments.department_id', 'left')
            ->join('machines', 'machines.id = shift_assignments.machine_id', 'left');
        
        if (!empty($filters['user_id'])) $builder->where('shift_assignments.user_id', $filters['user_id']);
        if (!empty($filters['shift_id'])) $builder->where('shift_assignments.shift_id', $filters['shift_id']);
        if (!empty($filters['department_id'])) $builder->where('shift_assignments.department_id', $filters['department_id']);
        if (!empty($filters['date_from'])) $builder->where('shift_assignments.start_date >=', $filters['date_from']);
        if (!empty($filters['date_to'])) $builder->where('shift_assignments.start_date <=', $filters['date_to']);
        
        return $builder->orderBy('shift_assignments.start_date', 'DESC')->findAll();
    }
}
