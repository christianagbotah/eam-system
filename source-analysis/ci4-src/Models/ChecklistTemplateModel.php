<?php
namespace App\Models;

use CodeIgniter\Model;

class ChecklistTemplateModel extends Model {
    protected $table = 'checklist_templates';
    protected $primaryKey = 'id';
    protected $allowedFields = ['template_code', 'title', 'description', 'machine_type', 'department_id', 'items', 'pass_threshold', 'frequency', 'is_active', 'version', 'created_by'];
    protected $useTimestamps = true;
}
