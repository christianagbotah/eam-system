<?php

namespace App\Models;

use CodeIgniter\Model;

class ProductionTargetModel extends Model
{
    protected $table = 'production_targets';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = true;
    protected $allowedFields = [
        'work_center', 'code', 'machine_id', 'target_date',
        'units_per_day', 'hours_per_unit_shift', 'target_per_machine',
        'total_time_available_mins', 'utilization_standard_percent',
        'speed_standard_yds_per_min', 'created_by'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $deletedField = 'deleted_at';
    protected $validationRules = [
        'work_center' => 'required|max_length[100]',
        'code' => 'required|max_length[50]',
        'machine_id' => 'required|integer',
        'target_date' => 'required|valid_date',
        'total_time_available_mins' => 'required|integer'
    ];
}
