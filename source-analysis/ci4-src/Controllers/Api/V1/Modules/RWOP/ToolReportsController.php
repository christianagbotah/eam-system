<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseApiController;

class ToolReportsController extends BaseApiController
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    /**
     * Tool Utilization Report
     * GET /api/v1/eam/tool-reports/utilization
     */
    public function utilization()
    {
        try {
            $plantId = $this->getPlantId();
            $startDate = $this->request->getGet('start_date') ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $this->request->getGet('end_date') ?? date('Y-m-d');

            $query = "
                SELECT 
                    t.id,
                    t.tool_code,
                    t.tool_name,
                    t.category,
                    t.availability_status,
                    COUNT(DISTINCT tr.id) as total_requests,
                    COUNT(DISTINCT CASE WHEN tr.request_status = 'ISSUED' THEN tr.id END) as times_issued,
                    SUM(CASE WHEN tr.request_status = 'COMPLETED' 
                        THEN DATEDIFF(tr.actual_return_date, til.issue_date) 
                        ELSE 0 END) as total_days_used,
                    AVG(CASE WHEN tr.request_status = 'COMPLETED' 
                        THEN DATEDIFF(tr.actual_return_date, til.issue_date) 
                        ELSE NULL END) as avg_days_per_use
                FROM tools t
                LEFT JOIN work_order_tool_requests tr ON t.id = tr.tool_id 
                    AND tr.created_at BETWEEN ? AND ?
                LEFT JOIN tool_issue_logs til ON tr.id = til.tool_request_id
                WHERE t.plant_id = ?
                GROUP BY t.id
                ORDER BY times_issued DESC
            ";

            $results = $this->db->query($query, [$startDate, $endDate, $plantId])->getResultArray();

            return $this->respond([
                'status' => 'success',
                'data' => $results,
                'period' => ['start' => $startDate, 'end' => $endDate]
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Tool utilization report error: ' . $e->getMessage());
            return $this->fail('Failed to generate utilization report', 500);
        }
    }

    /**
     * Overdue Returns Report
     * GET /api/v1/eam/tool-reports/overdue-returns
     */
    public function overdueReturns()
    {
        try {
            $plantId = $this->getPlantId();

            $query = "
                SELECT 
                    tr.id,
                    tr.work_order_id,
                    wo.work_order_number,
                    t.tool_code,
                    t.tool_name,
                    t.category,
                    u.username as issued_to_name,
                    tr.expected_return_date,
                    DATEDIFF(NOW(), tr.expected_return_date) as days_overdue,
                    tr.request_status
                FROM work_order_tool_requests tr
                JOIN tools t ON t.id = tr.tool_id
                JOIN users u ON u.id = tr.requested_by
                LEFT JOIN work_orders wo ON wo.id = tr.work_order_id
                WHERE tr.plant_id = ?
                    AND tr.request_status IN ('ISSUED', 'RETURN_PENDING')
                    AND tr.expected_return_date < NOW()
                ORDER BY days_overdue DESC
            ";

            $results = $this->db->query($query, [$plantId])->getResultArray();

            return $this->respond([
                'status' => 'success',
                'data' => $results,
                'total_overdue' => count($results)
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Overdue returns report error: ' . $e->getMessage());
            return $this->fail('Failed to generate overdue returns report', 500);
        }
    }

    /**
     * Tool Damage Report
     * GET /api/v1/eam/tool-reports/damage-report
     */
    public function damageReport()
    {
        try {
            $plantId = $this->getPlantId();
            $startDate = $this->request->getGet('start_date') ?? date('Y-m-d', strtotime('-90 days'));
            $endDate = $this->request->getGet('end_date') ?? date('Y-m-d');

            $query = "
                SELECT 
                    t.id,
                    t.tool_code,
                    t.tool_name,
                    t.category,
                    t.replacement_cost,
                    til.condition_on_return,
                    til.damage_notes,
                    til.penalty_cost,
                    til.return_date,
                    u.username as technician_name,
                    wo.work_order_number
                FROM tool_issue_logs til
                JOIN tools t ON t.id = til.tool_id
                JOIN users u ON u.id = til.issued_to
                LEFT JOIN work_order_tool_requests tr ON tr.id = til.tool_request_id
                LEFT JOIN work_orders wo ON wo.id = tr.work_order_id
                WHERE til.plant_id = ?
                    AND til.condition_on_return IN ('DAMAGED', 'LOST')
                    AND til.return_date BETWEEN ? AND ?
                ORDER BY til.return_date DESC
            ";

            $results = $this->db->query($query, [$plantId, $startDate, $endDate])->getResultArray();

            // Calculate summary
            $totalPenalty = array_sum(array_column($results, 'penalty_cost'));
            $totalReplacement = array_sum(array_map(function($r) {
                return $r['condition_on_return'] === 'LOST' ? $r['replacement_cost'] : 0;
            }, $results));

            // Technician-wise damage
            $technicianDamage = [];
            foreach ($results as $row) {
                $tech = $row['technician_name'];
                if (!isset($technicianDamage[$tech])) {
                    $technicianDamage[$tech] = ['count' => 0, 'total_cost' => 0];
                }
                $technicianDamage[$tech]['count']++;
                $technicianDamage[$tech]['total_cost'] += $row['penalty_cost'];
            }

            return $this->respond([
                'status' => 'success',
                'data' => $results,
                'summary' => [
                    'total_incidents' => count($results),
                    'total_penalty_cost' => $totalPenalty,
                    'total_replacement_cost' => $totalReplacement,
                    'total_cost' => $totalPenalty + $totalReplacement
                ],
                'by_technician' => $technicianDamage,
                'period' => ['start' => $startDate, 'end' => $endDate]
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Damage report error: ' . $e->getMessage());
            return $this->fail('Failed to generate damage report', 500);
        }
    }

    /**
     * Tool Lifecycle Cost Report
     * GET /api/v1/eam/tool-reports/lifecycle-cost
     */
    public function lifecycleCost()
    {
        try {
            $plantId = $this->getPlantId();

            $query = "
                SELECT 
                    t.id,
                    t.tool_code,
                    t.tool_name,
                    t.category,
                    t.purchase_cost,
                    t.replacement_cost,
                    COUNT(DISTINCT tr.id) as total_uses,
                    SUM(til.penalty_cost) as total_penalties,
                    COALESCE(SUM(CASE WHEN til.condition_on_return = 'LOST' THEN t.replacement_cost ELSE 0 END), 0) as replacement_costs,
                    (t.purchase_cost + COALESCE(SUM(til.penalty_cost), 0) + 
                     COALESCE(SUM(CASE WHEN til.condition_on_return = 'LOST' THEN t.replacement_cost ELSE 0 END), 0)) as total_lifecycle_cost
                FROM tools t
                LEFT JOIN work_order_tool_requests tr ON t.id = tr.tool_id
                LEFT JOIN tool_issue_logs til ON tr.id = til.tool_request_id
                WHERE t.plant_id = ?
                GROUP BY t.id
                ORDER BY total_lifecycle_cost DESC
            ";

            $results = $this->db->query($query, [$plantId])->getResultArray();

            return $this->respond([
                'status' => 'success',
                'data' => $results
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Lifecycle cost report error: ' . $e->getMessage());
            return $this->fail('Failed to generate lifecycle cost report', 500);
        }
    }

    /**
     * Calibration Compliance Report
     * GET /api/v1/eam/tool-reports/calibration-compliance
     */
    public function calibrationCompliance()
    {
        try {
            $plantId = $this->getPlantId();

            $query = "
                SELECT 
                    t.id,
                    t.tool_code,
                    t.tool_name,
                    t.category,
                    t.is_calibrated,
                    t.last_calibration_date,
                    t.next_calibration_date,
                    t.calibration_due_date,
                    CASE 
                        WHEN t.calibration_due_date < NOW() THEN 'OVERDUE'
                        WHEN t.calibration_due_date < DATE_ADD(NOW(), INTERVAL 30 DAY) THEN 'DUE_SOON'
                        ELSE 'COMPLIANT'
                    END as compliance_status,
                    DATEDIFF(t.calibration_due_date, NOW()) as days_until_due
                FROM tools t
                WHERE t.plant_id = ?
                    AND t.is_calibrated = 1
                    AND t.is_active = 1
                ORDER BY t.calibration_due_date ASC
            ";

            $results = $this->db->query($query, [$plantId])->getResultArray();

            // Calculate summary
            $overdue = array_filter($results, fn($r) => $r['compliance_status'] === 'OVERDUE');
            $dueSoon = array_filter($results, fn($r) => $r['compliance_status'] === 'DUE_SOON');
            $compliant = array_filter($results, fn($r) => $r['compliance_status'] === 'COMPLIANT');

            return $this->respond([
                'status' => 'success',
                'data' => $results,
                'summary' => [
                    'total_calibrated_tools' => count($results),
                    'overdue' => count($overdue),
                    'due_soon' => count($dueSoon),
                    'compliant' => count($compliant),
                    'compliance_rate' => count($results) > 0 ? round((count($compliant) / count($results)) * 100, 2) : 0
                ]
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Calibration compliance report error: ' . $e->getMessage());
            return $this->fail('Failed to generate calibration compliance report', 500);
        }
    }
}
