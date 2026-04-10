<?php
namespace App\Models;

use CodeIgniter\Model;

class SurveyAnalyticsCacheModel extends Model {
    protected $table = 'survey_analytics_cache';
    protected $primaryKey = 'cache_id';
    protected $allowedFields = ['metric_type', 'dimension', 'time_period', 'metric_data', 'expires_at'];
    protected $useTimestamps = false;
}
