<?php
namespace App\Models;

use CodeIgniter\Model;

class SurveySignatureModel extends Model {
    protected $table = 'survey_signatures';
    protected $primaryKey = 'signature_id';
    protected $allowedFields = ['survey_id', 'user_id', 'signature_type', 'signature_data', 'signature_method', 'ip_address', 'device_info', 'is_valid', 'invalidated_at', 'invalidated_by', 'invalidation_reason'];
    protected $useTimestamps = false;
}
