<?php

namespace App\Services;

use CodeIgniter\Database\ConnectionInterface;

/**
 * Work Order Reports Service
 * 
 * Enterprise-grade reporting and analytics for maintenance work orders
 * 
 * @package App\Services
 * @version 1.0.0
 */
class WorkOrderReportsService
{
    protected ConnectionInterface $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    /**
     * Work Order Performance Report
     */
    public function getPerformanceReport(string $dateFrom, string $dateTo, ?int $departmentId = null): array
    {
        $builder = $this->db->table('work_orders wo');
        
        if ($departmentId) {
            $builder->where('wo.department_id', $departmentId);
        }
        
        $builder->where('wo.created_at >=', $dateFrom)
                ->where('wo.created_at <=', $dateTo);

        $total = $builder->countAllResults(false);
        $completed = $builder->where('wo.status', 'completed')->countAllResults(false);
        $onTime = $builder->where('wo.actual_end <=', 'wo.scheduled_end', false)->countAllResults();
        
        $avgCompletionTime = $this->db->query("
            SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, actual_end)) as avg_hours
            FROM work_orders
            WHERE status = 'completed'
            AND created_at BETWEEN ? AND ?
        ", [$dateFrom, $dateTo])->getRow()->avg_hours;

        return [
            'total_work_orders' => $total,
            'completed' => $completed,
            'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0,
            'on_time' => $onTime,
            'on_time_rate' => $completed > 0 ? round(($onTime / $completed) * 100, 2) : 0,
            'avg_completion_hours' => round($avgCompletionTime ?? 0, 2),
            'by_status' => $this->getWorkOrdersByStatus($dateFrom, $dateTo, $departmentId),
            'by_priority' => $this->getWorkOrdersByPriority($dateFrom, $dateTo, $departmentId)
        ];
    }

    /**
     * Labor Utilization Report
     */
    public function getLaborUtilizationReport(string $dateFrom, string $dateTo): array
    {
        $technicians = $this->db->query("
            SELECT 
                u.id,
                u.full_name,
                u.username,
                u.trade,
                COUNT(DISTINCT wotm.work_order_id) as work_orders_completed,
                SUM(wotm.hours_worked) as total_hours,
                AVG(wotm.hours_worked) as avg_hours_per_wo,
                SUM(CASE WHEN wotm.is_leader = 1 THEN 1 ELSE 0 END) as times_as_leader
            FROM users u
            LEFT JOIN work_order_team_members wotm ON u.id = wotm.technician_id
            WHERE u.role = 'technician'
            AND wotm.created_at BETWEEN ? AND ?
            GROUP BY u.id
            ORDER BY total_hours DESC
        ", [$dateFrom, $dateTo])->getResultArray();

        $totalHours = array_sum(array_column($technicians, 'total_hours'));
        $avgUtilization = count($technicians) > 0 ? $totalHours / count($technicians) : 0;

        return [
            'technicians' => $technicians,
            'total_technicians' => count($technicians),
            'total_hours_worked' => round($totalHours, 2),
            'avg_hours_per_technician' => round($avgUtilization, 2),
            'utilization_by_trade' => $this->getUtilizationByTrade($dateFrom, $dateTo)
        ];
    }

    /**
     * Cost Analysis Report
     */
    public function getCostAnalysisReport(string $dateFrom, string $dateTo): array
    {
        $costs = $this->db->query("
            SELECT 
                wo.id,
                wo.wo_number,
                wo.title,
                a.asset_name,
                SUM(wotm.hours_worked * u.hourly_rate) as labor_cost,
                wo.material_cost,
                (SUM(wotm.hours_worked * u.hourly_rate) + COALESCE(wo.material_cost, 0)) as total_cost
            FROM work_orders wo
            LEFT JOIN work_order_team_members wotm ON wo.id = wotm.work_order_id
            LEFT JOIN users u ON wotm.technician_id = u.id
            LEFT JOIN assets a ON wo.asset_id = a.id
            WHERE wo.created_at BETWEEN ? AND ?
            AND wo.status = 'completed'
            GROUP BY wo.id
            ORDER BY total_cost DESC
        ", [$dateFrom, $dateTo])->getResultArray();

        $totalLaborCost = array_sum(array_column($costs, 'labor_cost'));
        $totalMaterialCost = array_sum(array_column($costs, 'material_cost'));

        return [
            'work_orders' => $costs,
            'total_labor_cost' => round($totalLaborCost, 2),
            'total_material_cost' => round($totalMaterialCost, 2),
            'total_cost' => round($totalLaborCost + $totalMaterialCost, 2),
            'avg_cost_per_wo' => count($costs) > 0 ? round(($totalLaborCost + $totalMaterialCost) / count($costs), 2) : 0,
            'cost_by_department' => $this->getCostByDepartment($dateFrom, $dateTo)
        ];
    }

    /**
     * MTTR/MTBF Report
     */
    public function getMTTRMTBFReport(?int $assetId = null): array
    {
        $query = "
            SELECT 
                a.id as asset_id,
                a.asset_name,
                COUNT(wo.id) as failure_count,
                AVG(TIMESTAMPDIFF(HOUR, wo.created_at, wo.actual_end)) as mttr_hours,
                DATEDIFF(MAX(wo.created_at), MIN(wo.created_at)) / NULLIF(COUNT(wo.id) - 1, 0) as mtbf_days
            FROM assets a
            LEFT JOIN work_orders wo ON a.id = wo.asset_id
            WHERE wo.wo_type = 'corrective'
            AND wo.status = 'completed'
        ";

        if ($assetId) {
            $query .= " AND a.id = ?";
            $result = $this->db->query($query . " GROUP BY a.id", [$assetId])->getResultArray();
        } else {
            $result = $this->db->query($query . " GROUP BY a.id ORDER BY mttr_hours DESC LIMIT 50")->getResultArray();
        }

        return [
            'assets' => $result,
            'avg_mttr' => round(array_sum(array_column($result, 'mttr_hours')) / count($result), 2),
            'avg_mtbf' => round(array_sum(array_column($result, 'mtbf_days')) / count($result), 2)
        ];
    }

    /**
     * Work Order Aging Report
     */
    public function getAgingReport(): array
    {
        $aging = $this->db->query("
            SELECT 
                wo.id,
                wo.wo_number,
                wo.title,
                wo.priority,
                wo.status,
                a.asset_name,
                DATEDIFF(NOW(), wo.created_at) as age_days,
                CASE 
                    WHEN DATEDIFF(NOW(), wo.created_at) <= 7 THEN '0-7 days'
                    WHEN DATEDIFF(NOW(), wo.created_at) <= 14 THEN '8-14 days'
                    WHEN DATEDIFF(NOW(), wo.created_at) <= 30 THEN '15-30 days'
                    ELSE '30+ days'
                END as age_bucket
            FROM work_orders wo
            LEFT JOIN assets a ON wo.asset_id = a.id
            WHERE wo.status NOT IN ('completed', 'cancelled')
            ORDER BY age_days DESC
        ")->getResultArray();

        $buckets = [
            '0-7 days' => 0,
            '8-14 days' => 0,
            '15-30 days' => 0,
            '30+ days' => 0
        ];

        foreach ($aging as $wo) {
            $buckets[$wo['age_bucket']]++;
        }

        return [
            'work_orders' => $aging,
            'age_distribution' => $buckets,
            'total_open' => count($aging),
            'overdue' => count(array_filter($aging, fn($wo) => $wo['age_days'] > 30))
        ];
    }

    /**
     * Technician Performance Report
     */
    public function getTechnicianPerformanceReport(int $technicianId, string $dateFrom, string $dateTo): array
    {
        $performance = $this->db->query("
            SELECT 
                COUNT(DISTINCT wotm.work_order_id) as total_work_orders,
                SUM(wotm.hours_worked) as total_hours,
                AVG(wotm.hours_worked) as avg_hours_per_wo,
                SUM(CASE WHEN wotm.is_leader = 1 THEN 1 ELSE 0 END) as times_as_leader,
                SUM(CASE WHEN wo.status = 'completed' THEN 1 ELSE 0 END) as completed_count
            FROM work_order_team_members wotm
            JOIN work_orders wo ON wotm.work_order_id = wo.id
            WHERE wotm.technician_id = ?
            AND wotm.created_at BETWEEN ? AND ?
        ", [$technicianId, $dateFrom, $dateTo])->getRowArray();

        $workOrders = $this->db->query("
            SELECT 
                wo.wo_number,
                wo.title,
                wotm.hours_worked,
                wotm.is_leader,
                wo.status,
                wo.created_at,
                wo.actual_end
            FROM work_order_team_members wotm
            JOIN work_orders wo ON wotm.work_order_id = wo.id
            WHERE wotm.technician_id = ?
            AND wotm.created_at BETWEEN ? AND ?
            ORDER BY wo.created_at DESC
        ", [$technicianId, $dateFrom, $dateTo])->getResultArray();

        return [
            'summary' => $performance,
            'work_orders' => $workOrders,
            'completion_rate' => $performance['total_work_orders'] > 0 
                ? round(($performance['completed_count'] / $performance['total_work_orders']) * 100, 2) 
                : 0
        ];
    }

    /**
     * Supervisor Dashboard Report
     */
    public function getSupervisorDashboard(int $supervisorId): array
    {
        $teamStats = $this->db->query("
            SELECT 
                COUNT(DISTINCT u.id) as team_size,
                COUNT(DISTINCT wotm.work_order_id) as active_work_orders,
                SUM(wotm.hours_worked) as total_hours_this_month
            FROM users u
            LEFT JOIN work_order_team_members wotm ON u.id = wotm.technician_id
            WHERE u.supervisor_id = ?
            AND MONTH(wotm.created_at) = MONTH(NOW())
        ", [$supervisorId])->getRowArray();

        $workOrderDistribution = $this->db->query("
            SELECT 
                wo.status,
                COUNT(*) as count
            FROM work_orders wo
            WHERE wo.assigned_supervisor_id = ?
            GROUP BY wo.status
        ", [$supervisorId])->getResultArray();

        return [
            'team_stats' => $teamStats,
            'work_order_distribution' => $workOrderDistribution,
            'pending_assignments' => $this->getPendingAssignments($supervisorId)
        ];
    }

    // Helper methods
    private function getWorkOrdersByStatus(string $dateFrom, string $dateTo, ?int $departmentId): array
    {
        $builder = $this->db->table('work_orders')
            ->select('status, COUNT(*) as count')
            ->where('created_at >=', $dateFrom)
            ->where('created_at <=', $dateTo)
            ->groupBy('status');
        
        if ($departmentId) {
            $builder->where('department_id', $departmentId);
        }
        
        return $builder->get()->getResultArray();
    }

    private function getWorkOrdersByPriority(string $dateFrom, string $dateTo, ?int $departmentId): array
    {
        $builder = $this->db->table('work_orders')
            ->select('priority, COUNT(*) as count')
            ->where('created_at >=', $dateFrom)
            ->where('created_at <=', $dateTo)
            ->groupBy('priority');
        
        if ($departmentId) {
            $builder->where('department_id', $departmentId);
        }
        
        return $builder->get()->getResultArray();
    }

    private function getUtilizationByTrade(string $dateFrom, string $dateTo): array
    {
        return $this->db->query("
            SELECT 
                u.trade,
                COUNT(DISTINCT u.id) as technician_count,
                SUM(wotm.hours_worked) as total_hours
            FROM users u
            LEFT JOIN work_order_team_members wotm ON u.id = wotm.technician_id
            WHERE wotm.created_at BETWEEN ? AND ?
            GROUP BY u.trade
        ", [$dateFrom, $dateTo])->getResultArray();
    }

    private function getCostByDepartment(string $dateFrom, string $dateTo): array
    {
        return $this->db->query("
            SELECT 
                d.name as department_name,
                COUNT(wo.id) as work_order_count,
                SUM(wotm.hours_worked * u.hourly_rate) as total_cost
            FROM departments d
            LEFT JOIN work_orders wo ON d.id = wo.department_id
            LEFT JOIN work_order_team_members wotm ON wo.id = wotm.work_order_id
            LEFT JOIN users u ON wotm.technician_id = u.id
            WHERE wo.created_at BETWEEN ? AND ?
            GROUP BY d.id
        ", [$dateFrom, $dateTo])->getResultArray();
    }

    private function getPendingAssignments(int $supervisorId): int
    {
        return $this->db->table('work_orders')
            ->where('assigned_supervisor_id', $supervisorId)
            ->where('status', 'forwarded')
            ->countAllResults();
    }
}
