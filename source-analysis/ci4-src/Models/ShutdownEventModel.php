<?php

namespace App\Models;

use CodeIgniter\Model;

class ShutdownEventModel extends Model
{
    protected $table = 'shutdown_events';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'event_name', 'event_type', 'facility_id', 'planned_start_date',
        'planned_end_date', 'actual_start_date', 'actual_end_date',
        'status', 'budget', 'actual_cost', 'coordinator_id'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'event_name' => 'required|string|max_length[255]',
        'event_type' => 'required|in_list[planned_shutdown,turnaround,overhaul]',
        'planned_start_date' => 'required|valid_date',
        'planned_end_date' => 'required|valid_date',
        'coordinator_id' => 'required|integer'
    ];
}
