<?php

namespace App\Services;

/**
 * Analytics Business Logic Service
 * Handles complex calculations and business rules
 */
class AnalyticsService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    /**
     * Calculate Plant Risk Index using business rules
     */
    public function calculatePlantRiskIndex(): int
    {
        // Get critical overdue work orders
        $criticalOverdue = $this->db->query("
            SELECT COUNT(*) as count
            FROM work_orders 
            WHERE status IN ('open', 'in_progress')
                AND priority = 'critical'
                AND DATE_ADD(created_at, INTERVAL sla_repair_hours HOUR) < NOW()
        ")->getRow()->count;
        
        // Get total open work orders
        $totalOpen = $this->db->query("
            SELECT COUNT(*) as count
            FROM work_orders 
            WHERE status IN ('open', 'in_progress')
        ")->getRow()->count;
        
        // Get high-risk assets (frequent failures)
        $highRiskAssets = $this->db->query("
            SELECT COUNT(DISTINCT asset_id) as count
            FROM work_orders 
            WHERE work_type = 'corrective' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY asset_id
            HAVING COUNT(*) >= 3
        ")->getNumRows();
        
        // Calculate risk index (0-100)
        $riskIndex = min(100, 
            ($criticalOverdue * 25) +  // Critical overdue = 25 points each
            ($totalOpen * 2) +         // Open WO = 2 points each
            ($highRiskAssets * 10)     // High-risk asset = 10 points each
        );
        
        return $riskIndex;
    }
    
    /**
     * Calculate Asset MTBF (Mean Time Between Failures)
     */
    public function calculateAssetMTBF(int $assetId, int $periodDays = 365): ?float
    {
        $failures = $this->db->query("
            SELECT COUNT(*) as count
            FROM work_orders 
            WHERE asset_id = ? 
                AND work_type = 'corrective' 
                AND status = 'completed'
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ", [$assetId, $periodDays])->getRow()->count;
        
        if ($failures == 0) {
            return null; // No failures = infinite MTBF
        }
        
        return round($periodDays / $failures, 2);
    }
    
    /**
     * Calculate Asset MTTR (Mean Time To Repair)
     */
    public function calculateAssetMTTR(int $assetId, int $periodDays = 365): ?float
    {
        $result = $this->db->query("
            SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, completed_at)) as avg_hours
            FROM work_orders 
            WHERE asset_id = ? 
                AND status = 'completed'
                AND completed_at IS NOT NULL
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ", [$assetId, $periodDays])->getRow();
        
        return $result->avg_hours ? round($result->avg_hours, 2) : null;
    }
    
    /**
     * Calculate SLA Compliance Rate
     */
    public function calculateSLACompliance(int $periodDays = 30): array
    {
        $result = $this->db->query("
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN completed_at <= DATE_ADD(created_at, INTERVAL sla_repair_hours HOUR) THEN 1 END) as on_time_orders,
                ROUND(COUNT(CASE WHEN completed_at <= DATE_ADD(created_at, INTERVAL sla_repair_hours HOUR) THEN 1 END) * 100.0 / COUNT(*), 2) as compliance_rate
            FROM work_orders 
            WHERE status = 'completed' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ", [$periodDays])->getRow();
        
        return [
            'total_orders' => $result->total_orders,
            'on_time_orders' => $result->on_time_orders,
            'compliance_rate' => $result->compliance_rate ?? 0
        ];
    }
    
    /**
     * Calculate Maintenance Cost Trends
     */
    public function getMaintenanceCostTrends(string $period = 'monthly', int $periods = 12): array
    {
        $dateFormat = $period === 'weekly' ? '%Y-%u' : '%Y-%m';
        $interval = $period === 'weekly' ? 'WEEK' : 'MONTH';
        
        return $this->db->query("
            SELECT 
                DATE_FORMAT(created_at, '{$dateFormat}') as period,
                SUM(total_maintenance_cost) as total_cost,
                SUM(labor_cost_total) as labor_cost,
                SUM(parts_cost_total) as parts_cost,
                SUM(contractor_cost_total) as contractor_cost,
                SUM(downtime_cost_total) as downtime_cost,
                COUNT(*) as work_order_count
            FROM work_orders 
            WHERE status = 'completed' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL {$periods} {$interval})
            GROUP BY DATE_FORMAT(created_at, '{$dateFormat}')
            ORDER BY period DESC
        ")->getResultArray();
    }
    
    /**
     * Get Top Cost Drivers (Assets with highest maintenance costs)
     */
    public function getTopCostDrivers(int $limit = 10, int $periodDays = 90): array
    {
        return $this->db->query("
            SELECT 
                a.id,
                a.name as asset_name,
                a.asset_number,
                SUM(wo.total_maintenance_cost) as total_cost,
                COUNT(wo.id) as work_order_count,
                AVG(wo.total_maintenance_cost) as avg_cost_per_wo,
                SUM(CASE WHEN wo.work_type = 'corrective' THEN wo.total_maintenance_cost ELSE 0 END) as corrective_cost,
                SUM(CASE WHEN wo.work_type = 'preventive' THEN wo.total_maintenance_cost ELSE 0 END) as preventive_cost
            FROM assets a
            JOIN work_orders wo ON a.id = wo.asset_id
            WHERE wo.status = 'completed' 
                AND wo.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY a.id, a.name, a.asset_number
            ORDER BY total_cost DESC
            LIMIT ?
        ", [$periodDays, $limit])->getResultArray();
    }
    
    /**
     * Calculate Technician Productivity Metrics
     */
    public function getTechnicianProductivity(int $periodDays = 30): array
    {
        return $this->db->query("
            SELECT 
                u.id,
                u.username as technician_name,
                COUNT(wo.id) as assigned_orders,
                COUNT(CASE WHEN wo.status = 'completed' THEN 1 END) as completed_orders,
                ROUND(COUNT(CASE WHEN wo.status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(wo.id), 0), 2) as completion_rate,
                SUM(CASE WHEN wo.status = 'completed' THEN wo.total_maintenance_cost ELSE 0 END) as total_work_value,
                AVG(CASE WHEN wo.status = 'completed' THEN TIMESTAMPDIFF(HOUR, wo.created_at, wo.completed_at) END) as avg_completion_hours,
                COALESCE(SUM(wte.duration_minutes), 0) as total_logged_minutes
            FROM users u
            LEFT JOIN work_orders wo ON u.id = wo.assigned_to 
                AND wo.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            LEFT JOIN work_order_time_entries wte ON wo.id = wte.work_order_id AND wte.user_id = u.id
            WHERE u.role IN ('technician', 'supervisor')
            GROUP BY u.id, u.username
            HAVING assigned_orders > 0
            ORDER BY completion_rate DESC, total_work_value DESC
        ", [$periodDays])->getResultArray();
    }
    
    /**
     * Get Downtime Analysis by Category
     */
    public function getDowntimeAnalysis(int $periodDays = 30): array
    {
        return $this->db->query("
            SELECT 
                dr.category,
                dr.description as reason,
                COUNT(dt.id) as incident_count,
                SUM(dt.duration_minutes) as total_downtime_minutes,
                SUM(dt.production_loss_ghs) as total_production_loss,
                AVG(dt.duration_minutes) as avg_downtime_minutes,
                ROUND(SUM(dt.duration_minutes) * 100.0 / (
                    SELECT SUM(duration_minutes) 
                    FROM downtime_records 
                    WHERE start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ), 2) as percentage_of_total
            FROM downtime_records dt
            JOIN downtime_reasons dr ON dt.reason_id = dr.id
            WHERE dt.start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY dr.category, dr.description
            ORDER BY total_production_loss DESC
        ", [$periodDays, $periodDays])->getResultArray();
    }
    
    /**
     * Update daily maintenance summary
     */
    public function updateDailySummary(string $date = null): void
    {
        $date = $date ?? date('Y-m-d');
        
        $summary = $this->db->query("
            SELECT 
                COUNT(*) as total_work_orders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_work_orders,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_maintenance_cost ELSE 0 END), 0) as total_maintenance_cost,
                COALESCE(SUM(CASE WHEN downtime_start IS NOT NULL AND downtime_end IS NOT NULL 
                    THEN TIMESTAMPDIFF(MINUTE, downtime_start, downtime_end) ELSE 0 END), 0) as total_downtime_minutes
            FROM work_orders 
            WHERE DATE(created_at) = ?
        ", [$date])->getRow();
        
        $slaCompliance = $this->calculateSLACompliance(1); // Today only
        $plantRisk = $this->calculatePlantRiskIndex();
        
        // Insert or update daily summary
        $this->db->query("
            INSERT INTO daily_maintenance_summary 
            (summary_date, total_work_orders, completed_work_orders, total_maintenance_cost, 
             total_downtime_minutes, sla_compliance_pct, plant_risk_index)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                total_work_orders = VALUES(total_work_orders),
                completed_work_orders = VALUES(completed_work_orders),
                total_maintenance_cost = VALUES(total_maintenance_cost),
                total_downtime_minutes = VALUES(total_downtime_minutes),
                sla_compliance_pct = VALUES(sla_compliance_pct),
                plant_risk_index = VALUES(plant_risk_index)
        ", [
            $date,
            $summary->total_work_orders,
            $summary->completed_work_orders,
            $summary->total_maintenance_cost,
            $summary->total_downtime_minutes,
            $slaCompliance['compliance_rate'],
            $plantRisk
        ]);
    }
}