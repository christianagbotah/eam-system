<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;

/**
 * Enterprise-Grade Work Order Analytics Controller
 * Provides comprehensive analytics, KPIs, and reporting for work orders
 */
class WorkOrderAnalyticsController extends BaseResourceController
{
    protected $format = 'json';

    /**
     * Get comprehensive work order performance metrics
     */
    public function performance()
    {
        try {
            $db = \Config\Database::connect();
            $filters = $this->getFilters();
            
            $builder = $db->table('work_orders wo')
                ->select('wo.id, wo.work_order_number, wo.type, wo.priority, wo.status,
                         wo.created_at, wo.actual_start, wo.actual_end,
                         TIMESTAMPDIFF(MINUTE, wo.created_at, wo.actual_start) as response_time_minutes,
                         TIMESTAMPDIFF(HOUR, wo.actual_start, wo.actual_end) as completion_time_hours,
                         wo.actual_hours as total_man_hours, wo.downtime_hours, wo.total_cost,
                         d.department_name')
                ->join('departments d', 'd.id = wo.department_id', 'left')
                ->where('wo.deleted_at IS NULL');

            $this->applyFilters($builder, $filters);
            
            $data = $builder->get()->getResultArray();
            
            // Calculate aggregates
            $metrics = $this->calculateMetrics($data);
            
            return $this->respond([
                'status' => 'success',
                'data' => $data,
                'metrics' => $metrics,
                'filters_applied' => $filters
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Analytics error: ' . $e->getMessage());
            return $this->failServerError('Failed to generate analytics');
        }
    }

    /**
     * Get technician productivity report
     */
    public function technicianProductivity()
    {
        try {
            $db = \Config\Database::connect();
            
            $data = $db->query("
                SELECT 
                    u.id, u.full_name, u.employee_number, u.trade, u.department_id,
                    d.department_name,
                    COUNT(DISTINCT wtm.work_order_id) as total_work_orders,
                    SUM(wtm.hours_worked) as total_hours_worked,
                    AVG(wtm.hours_worked) as avg_hours_per_wo,
                    COUNT(DISTINCT CASE WHEN wtm.is_leader = 1 THEN wtm.work_order_id END) as work_orders_as_leader,
                    (SELECT COUNT(*) FROM work_order_assistance_requests WHERE requested_by = u.id) as assistance_requests_made,
                    (SELECT AVG(TIMESTAMPDIFF(HOUR, wo.actual_start, wo.actual_end)) 
                     FROM work_orders wo 
                     JOIN work_order_team_members wtm2 ON wo.id = wtm2.work_order_id 
                     WHERE wtm2.technician_id = u.id AND wo.status = 'completed') as avg_completion_time
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                LEFT JOIN work_order_team_members wtm ON u.id = wtm.technician_id
                WHERE u.role IN ('technician', 'senior_technician')
                GROUP BY u.id, u.full_name, u.employee_number, u.trade, u.department_id, d.department_name
                ORDER BY total_hours_worked DESC
            ")->getResultArray();
            
            return $this->respond(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            log_message('error', 'Productivity report error: ' . $e->getMessage());
            return $this->failServerError('Failed to generate productivity report');
        }
    }

    /**
     * Get material consumption report
     */
    public function materialConsumption()
    {
        try {
            $db = \Config\Database::connect();
            $filters = $this->getFilters();
            
            $builder = $db->table('work_order_materials wom')
                ->select('wom.*, wo.work_order_number, wo.type as work_order_type,
                         ii.part_name, ii.part_code, u.full_name as requested_by_name,
                         d.department_name')
                ->join('work_orders wo', 'wo.id = wom.work_order_id')
                ->join('inventory_items ii', 'ii.id = wom.inventory_item_id', 'left')
                ->join('users u', 'u.id = wom.requested_by', 'left')
                ->join('departments d', 'd.id = wo.department_id', 'left');

            $this->applyFilters($builder, $filters);
            
            $data = $builder->get()->getResultArray();
            
            // Calculate totals
            $totals = [
                'total_cost' => array_sum(array_column($data, 'total_cost')),
                'total_quantity_used' => array_sum(array_column($data, 'actual_quantity_used')),
                'total_returned' => array_sum(array_column($data, 'returned_quantity'))
            ];
            
            return $this->respond([
                'status' => 'success',
                'data' => $data,
                'totals' => $totals
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Material consumption error: ' . $e->getMessage());
            return $this->failServerError('Failed to generate material report');
        }
    }

    /**
     * Get failure analysis report (MTBF/MTTR)
     */
    public function failureAnalysis()
    {
        try {
            $db = \Config\Database::connect();
            
            $data = $db->query("
                SELECT 
                    afh.asset_id, afh.asset_type,
                    COUNT(*) as failure_count,
                    AVG(afh.mtbf_hours) as avg_mtbf,
                    AVG(afh.mttr_hours) as avg_mttr,
                    SUM(afh.downtime_hours) as total_downtime,
                    SUM(afh.cost_impact) as total_cost_impact,
                    MAX(afh.failure_date) as last_failure_date,
                    fc.failure_name as most_common_failure
                FROM asset_failure_history afh
                LEFT JOIN failure_codes fc ON fc.id = afh.failure_code_id
                GROUP BY afh.asset_id, afh.asset_type
                ORDER BY failure_count DESC
            ")->getResultArray();
            
            return $this->respond(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            log_message('error', 'Failure analysis error: ' . $e->getMessage());
            return $this->failServerError('Failed to generate failure analysis');
        }
    }

    /**
     * Get work order timeline
     */
    public function timeline($workOrderId)
    {
        try {
            $db = \Config\Database::connect();
            
            $timeline = $db->table('work_order_timeline wt')
                ->select('wt.*, u1.full_name as performed_by_name, u2.full_name as affected_user_name')
                ->join('users u1', 'u1.id = wt.performed_by', 'left')
                ->join('users u2', 'u2.id = wt.affected_user_id', 'left')
                ->where('wt.work_order_id', $workOrderId)
                ->orderBy('wt.event_timestamp', 'ASC')
                ->get()
                ->getResultArray();
            
            return $this->respond(['status' => 'success', 'data' => $timeline]);
        } catch (\Exception $e) {
            log_message('error', 'Timeline error: ' . $e->getMessage());
            return $this->failServerError('Failed to retrieve timeline');
        }
    }

    /**
     * Get dashboard KPIs
     */
    public function dashboardKPIs()
    {
        try {
            $db = \Config\Database::connect();
            
            $kpis = [
                'total_work_orders' => $db->table('work_orders')->where('deleted_at IS NULL')->countAllResults(),
                'in_progress' => $db->table('work_orders')->where('status', 'in_progress')->countAllResults(),
                'completed_today' => $db->table('work_orders')
                    ->where('status', 'completed')
                    ->where('DATE(actual_end)', date('Y-m-d'))
                    ->countAllResults(),
                'overdue' => $db->table('work_orders')
                    ->whereIn('status', ['assigned', 'in_progress'])
                    ->where('planned_end <', date('Y-m-d H:i:s'))
                    ->countAllResults(),
                'avg_response_time' => $db->query("
                    SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, actual_start)) as avg_minutes
                    FROM work_orders 
                    WHERE actual_start IS NOT NULL AND deleted_at IS NULL
                ")->getRow()->avg_minutes ?? 0,
                'avg_completion_time' => $db->query("
                    SELECT AVG(TIMESTAMPDIFF(HOUR, actual_start, actual_end)) as avg_hours
                    FROM work_orders 
                    WHERE status = 'completed' AND deleted_at IS NULL
                ")->getRow()->avg_hours ?? 0,
                'total_downtime_hours' => $db->table('work_orders')
                    ->selectSum('downtime_hours')
                    ->where('deleted_at IS NULL')
                    ->get()
                    ->getRow()->downtime_hours ?? 0,
                'pending_assistance_requests' => $db->table('work_order_assistance_requests')
                    ->where('status', 'pending')
                    ->countAllResults()
            ];
            
            return $this->respond(['status' => 'success', 'data' => $kpis]);
        } catch (\Exception $e) {
            log_message('error', 'KPI error: ' . $e->getMessage());
            return $this->failServerError('Failed to calculate KPIs');
        }
    }

    private function getFilters()
    {
        return [
            'start_date' => $this->request->getGet('start_date'),
            'end_date' => $this->request->getGet('end_date'),
            'department_id' => $this->request->getGet('department_id'),
            'status' => $this->request->getGet('status'),
            'priority' => $this->request->getGet('priority')
        ];
    }

    private function applyFilters($builder, $filters)
    {
        if ($filters['start_date']) {
            $builder->where('wo.created_at >=', $filters['start_date']);
        }
        if ($filters['end_date']) {
            $builder->where('wo.created_at <=', $filters['end_date']);
        }
        if ($filters['department_id']) {
            $builder->where('wo.department_id', $filters['department_id']);
        }
        if ($filters['status']) {
            $builder->where('wo.status', $filters['status']);
        }
        if ($filters['priority']) {
            $builder->where('wo.priority', $filters['priority']);
        }
    }

    private function calculateMetrics($data)
    {
        if (empty($data)) {
            return [];
        }

        return [
            'total_work_orders' => count($data),
            'avg_response_time' => round(array_sum(array_column($data, 'response_time_minutes')) / count($data), 2),
            'avg_completion_time' => round(array_sum(array_column($data, 'completion_time_hours')) / count($data), 2),
            'total_man_hours' => array_sum(array_column($data, 'total_man_hours')),
            'total_downtime' => array_sum(array_column($data, 'downtime_hours')),
            'total_cost' => array_sum(array_column($data, 'total_cost'))
        ];
    }
}
