<?php

namespace App\Models;

use CodeIgniter\Model;

class RecurringWorkOrderModel extends Model
{
    protected $table = 'recurring_work_orders';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'template_id', 'title', 'description', 'machine_id', 'department_id',
        'assigned_to', 'frequency', 'start_date', 'end_date', 'next_due_date',
        'last_generated', 'is_active', 'priority', 'type', 'estimated_hours', 'created_by'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'title' => 'required|min_length[3]|max_length[255]',
        'department_id' => 'required|integer',
        'frequency' => 'required|in_list[daily,weekly,biweekly,monthly,quarterly,semiannual,annual]',
        'start_date' => 'required|valid_date',
        'priority' => 'required|in_list[low,medium,high,critical]',
        'type' => 'required|in_list[breakdown,preventive,corrective,inspection,project]'
    ];
}
