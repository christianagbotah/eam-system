<?php

namespace App\Models;

use CodeIgniter\Model;

class SurveyAlertModel extends Model
{
    protected $table = 'survey_alerts';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'survey_id', 'rule_id', 'alert_message', 'severity',
        'acknowledged', 'acknowledged_by', 'acknowledged_at'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = null;
}
