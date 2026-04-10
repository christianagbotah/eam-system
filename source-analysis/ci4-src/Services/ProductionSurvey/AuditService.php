<?php
namespace App\Services\ProductionSurvey;

use App\Models\SurveyAuditTrailModel;

class AuditService {
    protected $auditModel;

    public function __construct() {
        $this->auditModel = new SurveyAuditTrailModel();
    }

    public function log($surveyId, $userId, $action, $fieldName = null, $oldValue = null, $newValue = null) {
        return $this->auditModel->insert([
            'survey_id' => $surveyId,
            'user_id' => $userId,
            'action' => $action,
            'field_name' => $fieldName,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            'session_id' => session_id()
        ]);
    }

    public function getAuditTrail($surveyId) {
        return $this->auditModel->where('survey_id', $surveyId)->orderBy('created_at', 'DESC')->findAll();
    }
}
