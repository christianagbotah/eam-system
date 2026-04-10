<?php

namespace App\Libraries;

class EamMetrics
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    /**
     * Calculate MTBF (Mean Time Between Failures)
     */
    public function calculateMTBF($assetId, $days = 90)
    {
        $failures = $this->db->query("
            SELECT COUNT(*) as count
            FROM work_orders
            WHERE asset_id = ?
            AND work_type = 'corrective'
            AND status = 'completed'
            AND completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ", [$assetId, $days])->getRow();

        $operatingHours = $this->getOperatingHours($assetId, $days);
        
        return $failures->count > 0 ? $operatingHours / $failures->count : $operatingHours;
    }

    /**
     * Calculate MTTR (Mean Time To Repair)
     */
    public function calculateMTTR($assetId, $days = 90)
    {
        $result = $this->db->query("
            SELECT AVG(TIMESTAMPDIFF(HOUR, started_at, completed_at)) as avg_hours
            FROM work_orders
            WHERE asset_id = ?
            AND status = 'completed'
            AND started_at IS NOT NULL
            AND completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ", [$assetId, $days])->getRow();

        return $result->avg_hours ?? 0;
    }

    /**
     * Calculate PM Compliance Rate
     */
    public function calculatePMCompliance($startDate, $endDate)
    {
        $result = $this->db->query("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' AND completed_date <= due_date THEN 1 ELSE 0 END) as on_time
            FROM pm_schedules
            WHERE due_date BETWEEN ? AND ?
        ", [$startDate, $endDate])->getRow();

        return $result->total > 0 ? ($result->on_time / $result->total) * 100 : 0;
    }

    /**
     * Calculate Asset Availability
     */
    public function calculateAvailability($assetId, $days = 30)
    {
        $downtime = $this->db->query("
            SELECT SUM(TIMESTAMPDIFF(HOUR, started_at, completed_at)) as hours
            FROM work_orders
            WHERE asset_id = ?
            AND status = 'completed'
            AND completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ", [$assetId, $days])->getRow();

        $totalHours = $days * 24;
        $downtimeHours = $downtime->hours ?? 0;
        
        return (($totalHours - $downtimeHours) / $totalHours) * 100;
    }

    /**
     * Get maintenance cost per asset
     */
    public function getMaintenanceCost($assetId, $days = 90)
    {
        $result = $this->db->query("
            SELECT 
                SUM(wom.quantity * ii.unit_cost) as parts_cost,
                SUM(wo.labor_hours * 50) as labor_cost
            FROM work_orders wo
            LEFT JOIN work_order_materials wom ON wo.id = wom.work_order_id
            LEFT JOIN inventory_items ii ON wom.inventory_item_id = ii.id
            WHERE wo.asset_id = ?
            AND wo.completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ", [$assetId, $days])->getRow();

        return [
            'parts_cost' => $result->parts_cost ?? 0,
            'labor_cost' => $result->labor_cost ?? 0,
            'total_cost' => ($result->parts_cost ?? 0) + ($result->labor_cost ?? 0)
        ];
    }

    private function getOperatingHours($assetId, $days)
    {
        $meter = $this->db->query("
            SELECT current_reading
            FROM meters
            WHERE asset_id = ?
            LIMIT 1
        ", [$assetId])->getRow();

        return $meter ? $meter->current_reading : ($days * 24);
    }
}
