<?php
namespace App\Models;

use CodeIgniter\Model;

class SurveyAuditTrailModel extends Model {
    protected $table = 'survey_audit_trail';
    protected $primaryKey = 'audit_id';
    protected $allowedFields = ['survey_id', 'user_id', 'action', 'field_name', 'old_value', 'new_value', 'ip_address', 'user_agent', 'session_id'];
    protected $useTimestamps = false;
}
