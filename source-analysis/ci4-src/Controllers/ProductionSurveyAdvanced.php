<?php
namespace App\Controllers;

use App\Services\ProductionSurvey\SignatureService;
use App\Services\ProductionSurvey\TemplateService;
use App\Services\ProductionSurvey\WorkflowService;
use App\Services\ProductionSurvey\AuditService;
use App\Services\ProductionSurvey\CAPAService;
use App\Services\ProductionSurvey\SchedulingService;
use App\Services\ProductionSurvey\BatchService;
use App\Services\ProductionSurvey\AnalyticsService;

class ProductionSurveyAdvanced extends BaseController {
    
    // PHASE 1: Digital Signatures
    public function addSignature($surveyId) {
        $service = new SignatureService();
        $data = $this->request->getJSON(true);
        $data['survey_id'] = $surveyId;
        $data['user_id'] = $this->getUserId();
        
        $signatureId = $service->addSignature($data);
        return $this->respond(['signature_id' => $signatureId], 201);
    }

    public function validateSignatures($surveyId) {
        $service = new SignatureService();
        $isValid = $service->validateSignature($surveyId);
        return $this->respond(['valid' => $isValid]);
    }

    // PHASE 1: Templates
    public function createTemplate() {
        $service = new TemplateService();
        $data = $this->request->getJSON(true);
        $data['created_by'] = $this->getUserId();
        
        $templateId = $service->createTemplate($data);
        return $this->respond(['template_id' => $templateId], 201);
    }

    public function applyTemplate($templateId) {
        $service = new TemplateService();
        $surveyData = $this->request->getJSON(true);
        
        $result = $service->applyTemplate($templateId, $surveyData);
        return $this->respond($result);
    }

    // PHASE 1: Audit Trail
    public function getAuditTrail($surveyId) {
        $service = new AuditService();
        $trail = $service->getAuditTrail($surveyId);
        return $this->respond($trail);
    }

    // PHASE 2: CAPA
    public function createCAPA($surveyId) {
        $service = new CAPAService();
        $data = $this->request->getJSON(true);
        $data['survey_id'] = $surveyId;
        $data['created_by'] = $this->getUserId();
        
        $capaId = $service->createCAPA($data);
        return $this->respond(['capa_id' => $capaId], 201);
    }

    // PHASE 2: Scheduling
    public function generateScheduledSurveys() {
        $service = new SchedulingService();
        $service->generateScheduledSurveys();
        return $this->respond(['message' => 'Scheduled surveys generated']);
    }

    // PHASE 2: Batch Operations
    public function batchOperation() {
        $service = new BatchService();
        $data = $this->request->getJSON(true);
        $data['user_id'] = $this->getUserId();
        
        $batchId = $service->processBatch($data);
        return $this->respond(['batch_id' => $batchId], 202);
    }

    // PHASE 2: Analytics
    public function detectAnomalies($surveyId) {
        $service = new AnalyticsService();
        $anomalies = $service->detectAnomalies($surveyId);
        return $this->respond(['anomalies' => $anomalies]);
    }

    private function getUserId() {
        return $this->request->user_id ?? 1;
    }
}
