<?php
namespace App\Models;

use CodeIgniter\Model;

class SurveyCAPAModel extends Model {
    protected $table = 'survey_capa';
    protected $primaryKey = 'capa_id';
    protected $allowedFields = ['capa_code', 'survey_id', 'capa_type', 'issue_description', 'root_cause', 'action_plan', 'responsible_user_id', 'due_date', 'status', 'priority', 'cost_estimate', 'actual_cost', 'effectiveness_check', 'completed_at', 'verified_by', 'verified_at', 'created_by'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
