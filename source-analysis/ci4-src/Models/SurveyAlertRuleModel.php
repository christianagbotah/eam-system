<?php

namespace App\Models;

use CodeIgniter\Model;

class SurveyAlertRuleModel extends Model
{
    protected $table = 'survey_alert_rules';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'rule_name', 'alert_type', 'threshold_value', 'comparison',
        'notification_method', 'recipients', 'active'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = null;
}
