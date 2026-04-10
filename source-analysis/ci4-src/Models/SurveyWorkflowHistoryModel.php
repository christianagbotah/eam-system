<?php
namespace App\Models;

use CodeIgniter\Model;

class SurveyWorkflowHistoryModel extends Model {
    protected $table = 'survey_workflow_history';
    protected $primaryKey = 'history_id';
    protected $allowedFields = ['survey_id', 'rule_id', 'action_type', 'from_status', 'to_status', 'from_user_id', 'to_user_id', 'automated', 'metadata'];
    protected $useTimestamps = false;
}
