<?php

namespace App\Controllers\Api\V1\Modules\DIGITAL_TWIN;

use App\Controllers\Api\V1\BaseApiController;

class DigitalTwinController extends BaseApiController
{
    
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function metrics()
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantFilter = !empty($plantIds) ? "plant_id IN (" . implode(',', $plantIds) . ")" : "1=1";
            
            // Health Score calculation based on asset health_score field and status
            $healthQuery = $this->db->query("
                SELECT 
                    AVG(CASE 
                        WHEN health_score IS NOT NULL THEN health_score
                        WHEN status = 'active' THEN 95
                        WHEN status = 'maintenance' THEN 70
                        WHEN status = 'inactive' THEN 40
                        ELSE 50
                    END) as avg_health
                FROM assets_unified
                WHERE status != 'out_of_service'
                AND {$plantFilter}
            ");
            $healthScore = $healthQuery->getRow()->avg_health ?? 85;
            
            // Critical Assets count
            $criticalAssets = $this->db->table('assets_unified')
                ->where($plantFilter, null, false)
                ->where('criticality', 'critical')
                ->where('status !=', 'out_of_service')
                ->countAllResults();
            
            // Predicted Failures based on asset age, failure history, and health score
            $predictedFailuresQuery = $this->db->query("
                SELECT COUNT(DISTINCT a.id) as predicted_failures
                FROM assets_unified a
                LEFT JOIN work_orders wo ON wo.asset_id = a.id 
                    AND wo.type IN ('breakdown', 'corrective')
                    AND wo.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                WHERE a.status != 'out_of_service'
                AND a.{$plantFilter}
                AND (
                    a.health_score < 60 OR
                    a.criticality = 'critical' OR
                    (
                        SELECT COUNT(*) 
                        FROM work_orders wo2 
                        WHERE wo2.asset_id = a.id 
                        AND wo2.type IN ('breakdown', 'corrective')
                        AND wo2.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                    ) >= 3
                )
            ");
            $predictedFailures = $predictedFailuresQuery->getRow()->predicted_failures ?? 0;
            
            // Utilization Rate from production data or asset operational status
            $utilizationQuery = $this->db->query("
                SELECT 
                    AVG(TIMESTAMPDIFF(HOUR, start_time, end_time)) as avg_runtime
                FROM production_runs 
                WHERE start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                AND end_time IS NOT NULL
            ");
            $avgRuntime = $utilizationQuery->getRow()->avg_runtime ?? null;
            
            // Calculate utilization as percentage of time assets were running
            $utilizationRate = $avgRuntime ? min(($avgRuntime / 168) * 100, 100) : null;
            
            // Fallback to asset status if no production data
            if ($utilizationRate === null || $utilizationRate == 0) {
                $statusUtilizationQuery = $this->db->query("
                    SELECT 
                        (COUNT(CASE WHEN status = 'active' THEN 1 END) / COUNT(*)) * 100 as utilization
                    FROM assets_unified 
                    WHERE status IN ('active', 'maintenance', 'inactive')
                    AND {$plantFilter}
                ");
                $utilizationRate = $statusUtilizationQuery->getRow()->utilization ?? 75;
            }
            
            $data = [
                'healthScore' => round($healthScore, 0),
                'criticalAssets' => (int)$criticalAssets,
                'predictedFailures' => (int)$predictedFailures,
                'utilizationRate' => round($utilizationRate, 0)
            ];

            return $this->respond([
                'status' => 'success',
                'data' => $data
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Digital Twin metrics error: ' . $e->getMessage());
            return $this->failServerError('Failed to fetch digital twin metrics');
        }
    }
}
