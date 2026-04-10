<?php
namespace App\Services\ProductionSurvey;

use App\Models\ProductionSurveyModel;
use App\Models\SurveyAnalyticsCacheModel;
use App\Models\SurveyAnomalyModel;

class AnalyticsService {
    protected $surveyModel;
    protected $cacheModel;
    protected $anomalyModel;

    public function __construct() {
        $this->surveyModel = new ProductionSurveyModel();
        $this->cacheModel = new SurveyAnalyticsCacheModel();
        $this->anomalyModel = new SurveyAnomalyModel();
    }

    public function detectAnomalies($surveyId) {
        $survey = $this->surveyModel->find($surveyId);
        $historical = $this->surveyModel->where('machine_id', $survey['machine_id'])
            ->where('survey_id !=', $surveyId)
            ->orderBy('created_at', 'DESC')
            ->limit(30)
            ->findAll();

        if (count($historical) < 10) return [];

        $anomalies = [];
        $fields = ['units_produced', 'good_units', 'defect_units', 'downtime_minutes'];

        foreach ($fields as $field) {
            $values = array_column($historical, $field);
            $mean = array_sum($values) / count($values);
            $stdDev = $this->calculateStdDev($values, $mean);
            
            $deviation = abs($survey[$field] - $mean);
            $zScore = $stdDev > 0 ? $deviation / $stdDev : 0;

            if ($zScore > 2) {
                $anomalies[] = [
                    'survey_id' => $surveyId,
                    'anomaly_type' => 'statistical_outlier',
                    'field_name' => $field,
                    'expected_value' => round($mean, 2),
                    'actual_value' => $survey[$field],
                    'deviation_percent' => round(($deviation / $mean) * 100, 2),
                    'severity' => $zScore > 3 ? 'high' : 'medium',
                    'ml_confidence' => min(0.99, $zScore / 4)
                ];
            }
        }

        foreach ($anomalies as $anomaly) {
            $this->anomalyModel->insert($anomaly);
        }

        return $anomalies;
    }

    private function calculateStdDev($values, $mean) {
        $variance = array_sum(array_map(fn($x) => pow($x - $mean, 2), $values)) / count($values);
        return sqrt($variance);
    }
}
