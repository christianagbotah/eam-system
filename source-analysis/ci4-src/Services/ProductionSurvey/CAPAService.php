<?php
namespace App\Services\ProductionSurvey;

use App\Models\SurveyCAPAModel;
use App\Models\ProductionSurveyModel;

class CAPAService {
    protected $capaModel;
    protected $surveyModel;

    public function __construct() {
        $this->capaModel = new SurveyCAPAModel();
        $this->surveyModel = new ProductionSurveyModel();
    }

    public function createCAPA($data) {
        $capa = [
            'capa_code' => $this->generateCAPACode($data['capa_type']),
            'survey_id' => $data['survey_id'],
            'capa_type' => $data['capa_type'],
            'issue_description' => $data['issue_description'],
            'root_cause' => $data['root_cause'] ?? null,
            'action_plan' => $data['action_plan'],
            'responsible_user_id' => $data['responsible_user_id'],
            'due_date' => $data['due_date'],
            'priority' => $data['priority'] ?? 'medium',
            'created_by' => $data['created_by']
        ];

        $capaId = $this->capaModel->insert($capa);
        
        $this->surveyModel->update($data['survey_id'], [
            'capa_required' => true,
            'capa_count' => $this->capaModel->where('survey_id', $data['survey_id'])->countAllResults()
        ]);

        return $capaId;
    }

    private function generateCAPACode($type) {
        $prefix = $type === 'corrective' ? 'CA' : 'PA';
        return $prefix . '-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
    }
}
