<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;

class MaintenanceAnalyticsController extends BaseResourceController
{
    protected $format = 'json';

    public function dashboard()
    {
        $db = \Config\Database::connect();
        $startDate = $this->request->getGet('start_date') ?? date('Y-m-d', strtotime('-30 days'));
        $endDate = $this->request->getGet('end_date') ?? date('Y-m-d');

        // KPIs
        $kpis = [
            'total_requests' => $db->table('maintenance_requests')->where('created_at >=', $startDate)->where('created_at <=', $endDate)->countAllResults(),
            'total_work_orders' => $db->table('work_orders')->where('created_at >=', $startDate)->where('created_at <=', $endDate)->countAllResults(),
            'completed_work_orders' => $db->table('work_orders')->where('status', 'closed')->where('created_at >=', $startDate)->countAllResults(),
            'avg_completion_time' => $this->getAvgCompletionTime($startDate, $endDate),
            'on_time_completion_rate' => $this->getOnTimeRate($startDate, $endDate),
            'first_time_fix_rate' => $this->getFirstTimeFixRate($startDate, $endDate),
        ];

        // Request Status Distribution
        $requestStatus = $db->query("
            SELECT status, COUNT(*) as count 
            FROM maintenance_requests 
            WHERE created_at >= ? AND created_at <= ?
            GROUP BY status
        ", [$startDate, $endDate])->getResultArray();

        // Work Order Status Distribution
        $woStatus = $db->query("
            SELECT status, COUNT(*) as count 
            FROM work_orders 
            WHERE created_at >= ? AND created_at <= ?
            GROUP BY status
        ", [$startDate, $endDate])->getResultArray();

        // Priority Distribution
        $priorityDist = $db->query("
            SELECT priority, COUNT(*) as count 
            FROM work_orders 
            WHERE created_at >= ? AND created_at <= ?
            GROUP BY priority
        ", [$startDate, $endDate])->getResultArray();

        // Category/Type Distribution
        $typeDist = $db->query("
            SELECT type, COUNT(*) as count 
            FROM work_orders 
            WHERE created_at >= ? AND created_at <= ?
            GROUP BY type
        ", [$startDate, $endDate])->getResultArray();

        // Technician Performance
        $techPerformance = $db->query("
            SELECT u.username, 
                   COUNT(wo.id) as total_assigned,
                   SUM(CASE WHEN wo.status = 'closed' THEN 1 ELSE 0 END) as completed,
                   AVG(wo.actual_hours) as avg_hours,
                   AVG(CASE WHEN wo.inspection_status = 'passed' THEN 1 ELSE 0 END) * 100 as quality_score
            FROM work_orders wo
            JOIN users u ON u.id = wo.assigned_to
            WHERE wo.created_at >= ? AND wo.created_at <= ?
            GROUP BY wo.assigned_to, u.username
            ORDER BY completed DESC
            LIMIT 10
        ", [$startDate, $endDate])->getResultArray();

        // Department Performance
        $deptPerformance = $db->query("
            SELECT d.name, 
                   COUNT(wo.id) as total_work_orders,
                   AVG(wo.actual_hours) as avg_completion_time,
                   SUM(CASE WHEN wo.status = 'closed' THEN 1 ELSE 0 END) as completed
            FROM work_orders wo
            JOIN departments d ON d.id = wo.department_id
            WHERE wo.created_at >= ? AND wo.created_at <= ?
            GROUP BY wo.department_id, d.name
        ", [$startDate, $endDate])->getResultArray();

        // Trend Analysis (Daily)
        $trends = $db->query("
            SELECT DATE(created_at) as date,
                   COUNT(*) as count,
                   'work_orders' as type
            FROM work_orders
            WHERE created_at >= ? AND created_at <= ?
            GROUP BY DATE(created_at)
            ORDER BY date
        ", [$startDate, $endDate])->getResultArray();

        // Machine Breakdown Frequency
        $machineBreakdowns = $db->query("
            SELECT m.name, COUNT(wo.id) as breakdown_count
            FROM work_orders wo
            JOIN machines m ON m.id = wo.machine_id
            WHERE wo.type = 'breakdown' AND wo.created_at >= ? AND wo.created_at <= ?
            GROUP BY wo.machine_id, m.name
            ORDER BY breakdown_count DESC
            LIMIT 10
        ", [$startDate, $endDate])->getResultArray();

        // Response Time Analysis
        $responseTime = $db->query("
            SELECT AVG(TIMESTAMPDIFF(HOUR, wo.created_at, wo.assigned_date)) as avg_response_hours
            FROM work_orders wo
            WHERE wo.assigned_date IS NOT NULL 
            AND wo.created_at >= ? AND wo.created_at <= ?
        ", [$startDate, $endDate])->getRowArray();

        return $this->respond([
            'status' => 'success',
            'data' => [
                'kpis' => $kpis,
                'request_status' => $requestStatus,
                'work_order_status' => $woStatus,
                'priority_distribution' => $priorityDist,
                'type_distribution' => $typeDist,
                'technician_performance' => $techPerformance,
                'department_performance' => $deptPerformance,
                'trends' => $trends,
                'machine_breakdowns' => $machineBreakdowns,
                'avg_response_time' => $responseTime['avg_response_hours'] ?? 0
            ]
        ]);
    }

    private function getAvgCompletionTime($startDate, $endDate)
    {
        $db = \Config\Database::connect();
        $result = $db->query("
            SELECT AVG(TIMESTAMPDIFF(HOUR, actual_start, actual_end)) as avg_hours
            FROM work_orders
            WHERE status = 'closed' 
            AND actual_start IS NOT NULL 
            AND actual_end IS NOT NULL
            AND created_at >= ? AND created_at <= ?
        ", [$startDate, $endDate])->getRowArray();
        
        return round($result['avg_hours'] ?? 0, 2);
    }

    private function getOnTimeRate($startDate, $endDate)
    {
        $db = \Config\Database::connect();
        $result = $db->query("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN actual_end <= planned_end THEN 1 ELSE 0 END) as on_time
            FROM work_orders
            WHERE status = 'closed' 
            AND planned_end IS NOT NULL 
            AND actual_end IS NOT NULL
            AND created_at >= ? AND created_at <= ?
        ", [$startDate, $endDate])->getRowArray();
        
        if ($result['total'] > 0) {
            return round(($result['on_time'] / $result['total']) * 100, 2);
        }
        return 0;
    }

    private function getFirstTimeFixRate($startDate, $endDate)
    {
        $db = \Config\Database::connect();
        $result = $db->query("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN inspection_status = 'passed' THEN 1 ELSE 0 END) as passed
            FROM work_orders
            WHERE status = 'closed' 
            AND inspection_status IS NOT NULL
            AND created_at >= ? AND created_at <= ?
        ", [$startDate, $endDate])->getRowArray();
        
        if ($result['total'] > 0) {
            return round(($result['passed'] / $result['total']) * 100, 2);
        }
        return 0;
    }

    public function exportReport()
    {
        $startDate = $this->request->getGet('start_date') ?? date('Y-m-d', strtotime('-30 days'));
        $endDate = $this->request->getGet('end_date') ?? date('Y-m-d');
        $type = $this->request->getGet('type') ?? 'summary';

        $db = \Config\Database::connect();
        
        if ($type === 'detailed') {
            $data = $db->query("
                SELECT wo.work_order_number, wo.title, wo.priority, wo.type, wo.status,
                       m.name as machine, d.name as department, u.username as technician,
                       wo.created_at, wo.actual_start, wo.actual_end, wo.actual_hours,
                       wo.inspection_status
                FROM work_orders wo
                LEFT JOIN machines m ON m.id = wo.machine_id
                LEFT JOIN departments d ON d.id = wo.department_id
                LEFT JOIN users u ON u.id = wo.assigned_to
                WHERE wo.created_at >= ? AND wo.created_at <= ?
                ORDER BY wo.created_at DESC
            ", [$startDate, $endDate])->getResultArray();
        } else {
            $data = $this->dashboard()->getBody();
        }

        return $this->respond([
            'status' => 'success',
            'data' => $data
        ]);
    }
}
