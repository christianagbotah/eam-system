<?php
namespace App\Services\Risk;

use App\Models\RiskAssessmentModel;
use App\Models\RiskControlMeasureModel;

class RiskAssessmentService {
    protected $model;
    protected $measureModel;

    public function __construct() {
        $this->model = new RiskAssessmentModel();
        $this->measureModel = new RiskControlMeasureModel();
    }

    public function createAssessment($data) {
        $data['assessment_code'] = 'RA-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        
        if (isset($data['hazard_list'])) {
            $riskScore = $this->computeRiskScore($data['hazard_list']);
            $data['overall_risk_score'] = $riskScore['score'];
            $data['risk_level'] = $riskScore['level'];
        }
        
        return $this->model->insert($data);
    }

    public function computeRiskScore($hazards) {
        $totalScore = 0;
        $maxScore = 0;
        
        foreach ($hazards as $hazard) {
            $severity = $hazard['severity'] ?? 1;
            $likelihood = $hazard['likelihood'] ?? 1;
            $score = $severity * $likelihood;
            $totalScore += $score;
            $maxScore = max($maxScore, $score);
        }
        
        $level = 'Low';
        if ($maxScore >= 15) $level = 'Critical';
        elseif ($maxScore >= 10) $level = 'High';
        elseif ($maxScore >= 5) $level = 'Medium';
        
        return ['score' => $totalScore, 'level' => $level];
    }

    public function addControlMeasure($assessmentId, $data) {
        $data['assessment_id'] = $assessmentId;
        return $this->measureModel->insert($data);
    }

    public function closeAssessment($id) {
        return $this->model->update($id, [
            'status' => 'Closed',
            'closed_at' => date('Y-m-d H:i:s')
        ]);
    }
}
