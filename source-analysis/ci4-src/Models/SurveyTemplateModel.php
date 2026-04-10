<?php
namespace App\Models;

use CodeIgniter\Model;

class SurveyTemplateModel extends Model {
    protected $table = 'survey_templates';
    protected $primaryKey = 'template_id';
    protected $allowedFields = ['template_code', 'template_name', 'description', 'machine_type', 'department_id', 'template_data', 'field_config', 'validation_rules', 'is_active', 'version', 'created_by'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
