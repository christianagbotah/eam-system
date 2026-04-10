<?php
namespace App\Models;

use CodeIgniter\Model;

class SurveyWorkflowRuleModel extends Model {
    protected $table = 'survey_workflow_rules';
    protected $primaryKey = 'rule_id';
    protected $allowedFields = ['rule_name', 'rule_type', 'conditions', 'actions', 'priority', 'is_active'];
    protected $useTimestamps = false;
}
