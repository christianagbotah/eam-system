<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;

class DashboardController extends ResourceController
{
    protected $format = 'json';

    public function executiveMetrics()
    {
        $db = \Config\Database::connect();
        
        // Get total assets
        $totalAssets = $db->query("SELECT COUNT(*) as count FROM assets_unified WHERE status = 'active'")->getRowArray()['count'];
        
        // Get active work orders
        $activeWorkOrders = $db->query("SELECT COUNT(*) as count FROM work_orders WHERE status IN ('open', 'in_progress')")->getRowArray()['count'];
        
        // Get overdue work orders
        $overdueWorkOrders = $db->query("SELECT COUNT(*) as count FROM work_orders WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled')")->getRowArray()['count'];
        
        // Get monthly maintenance costs
        $maintenanceCosts = $db->query("
            SELECT COALESCE(SUM(total_cost), 0) as total 
            FROM work_orders 
            WHERE MONTH(created_at) = MONTH(NOW()) 
            AND YEAR(created_at) = YEAR(NOW())
        ")->getRowArray()['total'];
        
        // Calculate average OEE (mock data for now)
        $avgOEE = 85.2;
        
        // Calculate MTBF and MTTR (mock data for now)
        $mtbf = 168; // hours
        $mttr = 4.5; // hours
        
        // Calculate compliance rate
        $complianceRate = 94.8;
        
        return $this->respond([
            'status' => 'success',
            'data' => [
                'totalAssets' => (int)$totalAssets,
                'activeWorkOrders' => (int)$activeWorkOrders,
                'overdueWorkOrders' => (int)$overdueWorkOrders,
                'maintenanceCosts' => (float)$maintenanceCosts,
                'avgOEE' => $avgOEE,
                'mtbf' => $mtbf,
                'mttr' => $mttr,
                'complianceRate' => $complianceRate
            ]
        ]);
    }

    public function kpiSummary()
    {
        $db = \Config\Database::connect();
        
        $query = $db->query("
            SELECT 
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_assets,
                COUNT(CASE WHEN criticality = 'critical' THEN 1 END) as critical_assets,
                COUNT(CASE WHEN criticality = 'high' THEN 1 END) as high_criticality_assets
            FROM assets_unified
        ");
        
        return $this->respond([
            'status' => 'success',
            'data' => $query->getRowArray()
        ]);
    }

    public function performanceTrends()
    {
        $db = \Config\Database::connect();
        
        $query = $db->query("
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as period,
                COUNT(*) as work_orders,
                AVG(CASE WHEN completed_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(HOUR, created_at, completed_at) 
                    ELSE NULL END) as avg_completion_time
            FROM work_orders
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY period DESC
        ");
        
        return $this->respond([
            'status' => 'success',
            'data' => $query->getResultArray()
        ]);
    }
}