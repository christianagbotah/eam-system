<?php
namespace App\Services\Analytics;

class AssetHealthService {
    protected $db;

    public function __construct() {
        $this->db = \Config\Database::connect();
    }

    public function calculateHealthScore($assetId) {
        $uptime = $this->getUptimeScore($assetId);
        $pmCompliance = $this->getPMComplianceScore($assetId);
        $ageFactor = $this->getAgeFactorScore($assetId);
        $failureRate = $this->getFailureRateScore($assetId);
        
        $health = ($uptime * 0.4) + ($pmCompliance * 0.3) + ($ageFactor * 0.2) + ($failureRate * 0.1);
        
        return [
            'asset_id' => $assetId,
            'health_score' => round($health, 2),
            'health_status' => $this->getHealthStatus($health),
            'uptime' => round($uptime, 2),
            'pm_compliance' => round($pmCompliance, 2),
            'age_factor' => round($ageFactor, 2),
            'failure_rate' => round($failureRate, 2)
        ];
    }

    private function getUptimeScore($assetId) {
        $result = $this->db->query("SELECT COALESCE(SUM(CASE WHEN status = 'Running' THEN 1 ELSE 0 END) / COUNT(*) * 100, 100) as uptime FROM production_surveys WHERE machine_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", [$assetId])->getRow();
        return $result ? $result->uptime : 100;
    }

    private function getPMComplianceScore($assetId) {
        $result = $this->db->query("SELECT COALESCE(SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) / COUNT(*) * 100, 100) as compliance FROM work_orders WHERE asset_id = ? AND work_order_type = 'Preventive' AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)", [$assetId])->getRow();
        return $result ? $result->compliance : 100;
    }

    private function getAgeFactorScore($assetId) {
        $result = $this->db->query("SELECT DATEDIFF(NOW(), installation_date) as age_days FROM machines WHERE id = ?", [$assetId])->getRow();
        if (!$result) return 100;
        $ageRatio = $result->age_days / (10 * 365);
        return max(0, (1 - $ageRatio) * 100);
    }

    private function getFailureRateScore($assetId) {
        $result = $this->db->query("SELECT COUNT(*) as failures FROM work_orders WHERE asset_id = ? AND work_order_type = 'Breakdown' AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)", [$assetId])->getRow();
        $failures = $result ? $result->failures : 0;
        return max(0, 100 - ($failures * 10));
    }

    private function getHealthStatus($score) {
        if ($score >= 80) return 'Excellent';
        if ($score >= 60) return 'Good';
        if ($score >= 40) return 'Fair';
        if ($score >= 20) return 'Poor';
        return 'Critical';
    }

    public function getAllAssetsHealth() {
        $assets = $this->db->query("SELECT id FROM machines WHERE status = 'active'")->getResult();
        $results = [];
        foreach ($assets as $asset) {
            $results[] = $this->calculateHealthScore($asset->id);
        }
        return $results;
    }
}
