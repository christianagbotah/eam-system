<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderTemplateModel extends Model
{
    protected $table = 'work_order_templates';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'template_name', 'description', 'type', 'priority', 'estimated_hours',
        'instructions', 'safety_notes', 'checklist', 'required_parts', 'created_by'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'template_name' => 'required|min_length[3]|max_length[255]',
        'type' => 'required|in_list[breakdown,preventive,corrective,inspection,project]',
        'priority' => 'required|in_list[low,medium,high,critical]'
    ];
}
