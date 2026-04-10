<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;

class FinancialController extends ResourceController
{
    protected $format = 'json';

    public function periods()
    {
        $db = \Config\Database::connect();
        $query = $db->query("SELECT * FROM financial_periods ORDER BY period_year DESC, period_month DESC");
        
        return $this->respond([
            'status' => 'success',
            'data' => $query->getResultArray()
        ]);
    }

    public function lockPeriod($id = null)
    {
        $db = \Config\Database::connect();
        $userId = $this->request->getHeaderLine('User-ID') ?: 1;
        
        $db->query("UPDATE financial_periods SET status = 'locked', locked_by = ?, locked_at = NOW() WHERE id = ?", [$userId, $id]);
        
        $period = $db->query("SELECT * FROM financial_periods WHERE id = ?", [$id])->getRowArray();
        
        $db->query("UPDATE work_orders SET is_locked = 1, locked_by = ?, locked_at = NOW(), lock_reason = 'Financial period locked' WHERE created_at BETWEEN ? AND ?", 
                  [$userId, $period['start_date'], $period['end_date']]);
        
        return $this->respond(['status' => 'success', 'message' => 'Period locked successfully']);
    }

    public function costSummary()
    {
        $db = \Config\Database::connect();
        
        $query = $db->query("
            SELECT 
                DATE_FORMAT(wo.created_at, '%Y-%m') as period,
                COALESCE(SUM(wo.labor_cost), 0) as labor_cost,
                COALESCE(SUM(wo.parts_cost), 0) as parts_cost,
                COALESCE(SUM(wo.contractor_cost), 0) as contractor_cost,
                COALESCE(SUM(wo.downtime_cost), 0) as downtime_cost,
                COALESCE(SUM(wo.total_cost), 0) as total_cost,
                COUNT(*) as work_order_count
            FROM work_orders wo
            WHERE wo.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(wo.created_at, '%Y-%m')
            ORDER BY period DESC
        ");
        
        return $this->respond([
            'status' => 'success',
            'data' => $query->getResultArray()
        ]);
    }
}