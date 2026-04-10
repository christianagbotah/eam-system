<?php

namespace App\Models;

use CodeIgniter\Model;

class EmployeeShiftModel extends Model
{
    protected $table = 'employee_shifts';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = ['user_id', 'shift_id', 'department_id', 'start_date', 'end_date'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
