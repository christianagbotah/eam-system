<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\Api\V1\BaseResourceController;

class PmAnalyticsController extends BaseResourceController
{
    protected $format = 'json';

    public function dashboard()
    {
        $db = \Config\Database::connect();
        
        // PM Compliance Rate
        $totalTasks = $db->table('part_pm_tasks')->where('is_active', 1)->countAllResults();
        $completedOnTime = $db->table('pm_work_orders')
            ->where('status', 'completed')
            ->where('completed_at <=', 'due_date', false)
            ->countAllResults();
        $complianceRate = $totalTasks > 0 ? round(($completedOnTime / $totalTasks) * 100, 1) : 0;
        
        // Work Order Stats
        $woStats = [
            'pending' => $db->table('pm_work_orders')->where('status', 'pending')->countAllResults(),
            'assigned' => $db->table('pm_work_orders')->where('status', 'assigned')->countAllResults(),
            'in_progress' => $db->table('pm_work_orders')->where('status', 'in_progress')->countAllResults(),
            'completed' => $db->table('pm_work_orders')->where('status', 'completed')->countAllResults(),
            'overdue' => $db->table('pm_work_orders')
                ->where('status !=', 'completed')
                ->where('due_date <', date('Y-m-d'))
                ->countAllResults()
        ];
        
        // PM by Trigger Type
        $byTrigger = $db->table('part_pm_tasks')
            ->select('pm_trigger_types.trigger_name, COUNT(*) as count')
            ->join('pm_trigger_types', 'pm_trigger_types.trigger_id = part_pm_tasks.pm_trigger_id')
            ->where('part_pm_tasks.is_active', 1)
            ->groupBy('part_pm_tasks.pm_trigger_id')
            ->get()
            ->getResultArray();
        
        // Upcoming PM Tasks (Next 30 Days)
        $upcoming = $db->table('part_pm_tasks')
            ->select('COUNT(*) as count')
            ->where('is_active', 1)
            ->where('next_due_date >=', date('Y-m-d'))
            ->where('next_due_date <=', date('Y-m-d', strtotime('+30 days')))
            ->get()
            ->getRowArray();
        
        // Average Completion Time
        $avgTime = $db->query("
            SELECT AVG(TIMESTAMPDIFF(HOUR, started_at, completed_at)) as avg_hours
            FROM pm_work_orders
            WHERE status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL
        ")->getRowArray();
        
        // Monthly Trend (Last 6 Months)
        $monthlyTrend = $db->query("
            SELECT 
                DATE_FORMAT(completed_at, '%Y-%m') as month,
                COUNT(*) as completed
            FROM pm_work_orders
            WHERE status = 'completed' AND completed_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(completed_at, '%Y-%m')
            ORDER BY month ASC
        ")->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => [
                'compliance_rate' => $complianceRate,
                'work_order_stats' => $woStats,
                'by_trigger' => $byTrigger,
                'upcoming_count' => $upcoming['count'] ?? 0,
                'avg_completion_hours' => round($avgTime['avg_hours'] ?? 0, 1),
                'monthly_trend' => $monthlyTrend,
                'total_active_tasks' => $totalTasks
            ]
        ]);
    }

    public function partPerformance()
    {
        $db = \Config\Database::connect();
        
        $parts = $db->query("
            SELECT 
                p.id,
                p.part_name,
                p.part_number,
                COUNT(DISTINCT ppt.id) as pm_tasks_count,
                COUNT(DISTINCT wo.id) as work_orders_count,
                SUM(CASE WHEN wo.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                SUM(CASE WHEN wo.status != 'completed' AND wo.due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_count
            FROM parts p
            LEFT JOIN part_pm_tasks ppt ON ppt.part_id = p.id AND ppt.is_active = 1
            LEFT JOIN pm_work_orders wo ON wo.part_id = p.id
            GROUP BY p.id
            HAVING pm_tasks_count > 0
            ORDER BY overdue_count DESC, work_orders_count DESC
            LIMIT 20
        ")->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $parts
        ]);
    }

    public function technicianPerformance()
    {
        $db = \Config\Database::connect();
        
        $technicians = $db->query("
            SELECT 
                assigned_to as technician_id,
                COUNT(*) as total_assigned,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'completed' AND completed_at <= due_date THEN 1 ELSE 0 END) as on_time,
                AVG(TIMESTAMPDIFF(HOUR, started_at, completed_at)) as avg_hours
            FROM pm_work_orders
            WHERE assigned_to IS NOT NULL
            GROUP BY assigned_to
            ORDER BY completed DESC
        ")->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $technicians
        ]);
    }
}
