<?php
namespace App\Models;

use CodeIgniter\Model;

class SurveyAnomalyModel extends Model {
    protected $table = 'survey_anomalies';
    protected $primaryKey = 'anomaly_id';
    protected $allowedFields = ['survey_id', 'anomaly_type', 'field_name', 'expected_value', 'actual_value', 'deviation_percent', 'severity', 'ml_confidence', 'acknowledged_by', 'acknowledged_at'];
    protected $useTimestamps = false;
}
