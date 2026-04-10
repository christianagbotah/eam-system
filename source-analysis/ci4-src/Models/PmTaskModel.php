<?php

namespace App\Models;

use CodeIgniter\Model;

class PmTaskModel extends Model
{
    protected $table = 'pm_tasks';
    protected $primaryKey = 'task_id';
    protected $allowedFields = ['task_name', 'task_description', 'task_category'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
