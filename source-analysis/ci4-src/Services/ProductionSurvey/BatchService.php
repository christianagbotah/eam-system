<?php
namespace App\Services\ProductionSurvey;

use App\Models\SurveyBatchOperationModel;
use App\Models\ProductionSurveyModel;

class BatchService {
    protected $batchModel;
    protected $surveyModel;

    public function __construct() {
        $this->batchModel = new SurveyBatchOperationModel();
        $this->surveyModel = new ProductionSurveyModel();
    }

    public function processBatch($data) {
        $batchId = $this->batchModel->insert([
            'operation_type' => $data['operation_type'],
            'survey_ids' => json_encode($data['survey_ids']),
            'parameters' => json_encode($data['parameters'] ?? []),
            'initiated_by' => $data['user_id'],
            'total_count' => count($data['survey_ids']),
            'status' => 'processing',
            'started_at' => date('Y-m-d H:i:s')
        ]);

        $results = ['success' => 0, 'failed' => 0, 'errors' => []];

        foreach ($data['survey_ids'] as $surveyId) {
            try {
                $this->executeOperation($data['operation_type'], $surveyId, $data['parameters'] ?? []);
                $results['success']++;
            } catch (\Exception $e) {
                $results['failed']++;
                $results['errors'][] = ['survey_id' => $surveyId, 'error' => $e->getMessage()];
            }
        }

        $this->batchModel->update($batchId, [
            'status' => 'completed',
            'processed_count' => count($data['survey_ids']),
            'success_count' => $results['success'],
            'failed_count' => $results['failed'],
            'error_log' => json_encode($results['errors']),
            'completed_at' => date('Y-m-d H:i:s')
        ]);

        return $batchId;
    }

    private function executeOperation($type, $surveyId, $params) {
        switch ($type) {
            case 'approve':
                $this->surveyModel->update($surveyId, ['status' => 'approved', 'approved_at' => date('Y-m-d H:i:s')]);
                break;
            case 'reject':
                $this->surveyModel->update($surveyId, ['status' => 'rejected']);
                break;
            case 'update':
                $this->surveyModel->update($surveyId, $params);
                break;
        }
    }
}
