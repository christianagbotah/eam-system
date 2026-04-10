<?php
namespace App\Services\ProductionSurvey;

use App\Models\SurveySignatureModel;
use App\Models\ProductionSurveyModel;

class SignatureService {
    protected $signatureModel;
    protected $surveyModel;
    protected $auditService;

    public function __construct() {
        $this->signatureModel = new SurveySignatureModel();
        $this->surveyModel = new ProductionSurveyModel();
        $this->auditService = new AuditService();
    }

    public function addSignature($data) {
        $signature = [
            'survey_id' => $data['survey_id'],
            'user_id' => $data['user_id'],
            'signature_type' => $data['signature_type'],
            'signature_data' => $data['signature_data'],
            'signature_method' => $data['signature_method'] ?? 'drawn',
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'device_info' => $_SERVER['HTTP_USER_AGENT'] ?? null
        ];

        $signatureId = $this->signatureModel->insert($signature);
        
        $this->surveyModel->update($data['survey_id'], [
            $data['signature_type'] . '_signed_at' => date('Y-m-d H:i:s')
        ]);

        $this->auditService->log($data['survey_id'], $data['user_id'], 'signature_added', 'signature_type', null, $data['signature_type']);

        return $signatureId;
    }

    public function validateSignature($surveyId) {
        $survey = $this->surveyModel->find($surveyId);
        $signatures = $this->signatureModel->where('survey_id', $surveyId)->where('is_valid', true)->findAll();

        $required = [];
        if ($survey['requires_operator_signature']) $required[] = 'operator';
        if ($survey['requires_supervisor_signature']) $required[] = 'supervisor';

        $existing = array_column($signatures, 'signature_type');
        return count(array_diff($required, $existing)) === 0;
    }
}
