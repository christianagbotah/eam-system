<?php

namespace App\Services;

class PredictiveService
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function calculateHealthScore($assetId)
    {
        $asset = $this->db->table('assets')->where('id', $assetId)->get()->getRowArray();
        
        // Get failure history
        $failures = $this->db->table('work_orders')
            ->where('asset_id', $assetId)
            ->where('wo_type', 'corrective')
            ->where('created_at >', date('Y-m-d', strtotime('-1 year')))
            ->countAllResults();

        // Get PM compliance
        $pmCompliance = $this->db->table('pm_history')
            ->where('asset_id', $assetId)
            ->where('status', 'completed')
            ->where('completed_date >', date('Y-m-d', strtotime('-6 months')))
            ->countAllResults();

        // Calculate score (0-100)
        $baseScore = 100;
        $baseScore -= ($failures * 10); // -10 per failure
        $baseScore += ($pmCompliance * 5); // +5 per completed PM
        $healthScore = max(0, min(100, $baseScore));

        // Calculate failure probability
        $failureProbability = 100 - $healthScore;

        // Estimate remaining useful life (days)
        $rul = $healthScore > 70 ? 365 : ($healthScore > 40 ? 180 : 90);

        // Determine risk level
        $riskLevel = $failureProbability > 70 ? 'critical' : 
                    ($failureProbability > 50 ? 'high' : 
                    ($failureProbability > 30 ? 'medium' : 'low'));

        $data = [
            'asset_id' => $assetId,
            'health_score' => $healthScore,
            'failure_probability' => $failureProbability,
            'remaining_useful_life' => $rul,
            'risk_level' => $riskLevel,
            'prediction_date' => date('Y-m-d H:i:s'),
            'factors' => json_encode([
                'failures_last_year' => $failures,
                'pm_compliance' => $pmCompliance
            ])
        ];

        $this->db->table('predictive_health_scores')->insert($data);

        return $data;
    }

    public function detectAnomalies($assetId)
    {
        $metrics = $this->db->table('iot_metrics')
            ->where('asset_id', $assetId)
            ->where('timestamp >', date('Y-m-d H:i:s', strtotime('-24 hours')))
            ->get()->getResultArray();

        $anomalies = [];

        foreach ($metrics as $metric) {
            $avg = $this->db->table('iot_metrics')
                ->where('asset_id', $assetId)
                ->where('metric_name', $metric['metric_name'])
                ->selectAvg('value', 'avg_value')
                ->get()->getRow()->avg_value;

            $deviation = abs($metric['value'] - $avg);
            $threshold = $avg * 0.2; // 20% deviation

            if ($deviation > $threshold) {
                $severity = $deviation > ($avg * 0.5) ? 'high' : 
                           ($deviation > ($avg * 0.3) ? 'medium' : 'low');

                $anomalies[] = [
                    'asset_id' => $assetId,
                    'metric_name' => $metric['metric_name'],
                    'expected_value' => $avg,
                    'actual_value' => $metric['value'],
                    'deviation' => $deviation,
                    'severity' => $severity,
                    'detected_at' => date('Y-m-d H:i:s')
                ];
            }
        }

        if (!empty($anomalies)) {
            $this->db->table('anomaly_detections')->insertBatch($anomalies);
        }

        return $anomalies;
    }

    public function getAssetsAtRisk()
    {
        return $this->db->table('predictive_health_scores phs')
            ->select('phs.*, a.asset_name, a.asset_code')
            ->join('assets a', 'a.id = phs.asset_id')
            ->where('phs.risk_level IN ("high","critical")')
            ->orderBy('phs.failure_probability', 'DESC')
            ->limit(20)
            ->get()->getResultArray();
    }
}
