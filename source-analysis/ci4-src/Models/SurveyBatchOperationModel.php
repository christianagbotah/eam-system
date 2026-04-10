<?php
namespace App\Models;

use CodeIgniter\Model;

class SurveyBatchOperationModel extends Model {
    protected $table = 'survey_batch_operations';
    protected $primaryKey = 'batch_id';
    protected $allowedFields = ['operation_type', 'survey_ids', 'parameters', 'initiated_by', 'status', 'total_count', 'processed_count', 'success_count', 'failed_count', 'error_log', 'started_at', 'completed_at'];
    protected $useTimestamps = false;
}
