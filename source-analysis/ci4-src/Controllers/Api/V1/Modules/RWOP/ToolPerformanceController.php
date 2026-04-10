<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class ToolPerformanceController extends ResourceController
{
    use ResponseTrait;

    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    // GET /api/v1/eam/tool-performance/usage-patterns
    public function usagePatterns()
    {
        try {
            $plantId = $this->request->getGet('plant_id') ?? 1;
            $days = $this->request->getGet('days') ?? 30;
            
            $sql = "SELECT 
                        t.id, t.name, t.code, tc.name as category,
                        COUNT(tr.id) as total_requests,
                        AVG(DATEDIFF(COALESCE(tr.actual_return_date, tr.expected_return_date), tr.issued_date)) as avg_usage_days,
                        SUM(CASE WHEN tr.actual_return_date > tr.expected_return_date THEN 1 ELSE 0 END) as overdue_count,
                        MAX(tr.issued_date) as last_used
                    FROM tools t
                    LEFT JOIN tool_categories tc ON tc.id = t.category_id
                    LEFT JOIN tool_requests tr ON tr.tool_id = t.id AND tr.status IN ('ISSUED', 'RETURNED')
                        AND tr.issued_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                    WHERE t.plant_id = ? AND t.status = 'ACTIVE'
                    GROUP BY t.id
                    ORDER BY total_requests DESC";
            
            $result = $this->db->query($sql, [$days, $plantId])->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error fetching usage patterns: ' . $e->getMessage());
        }
    }

    // GET /api/v1/eam/tool-performance/efficiency
    public function efficiency()
    {
        try {
            $plantId = $this->request->getGet('plant_id') ?? 1;
            
            $sql = "SELECT 
                        t.id, t.name, t.code,
                        COUNT(tr.id) as usage_count,
                        AVG(CASE WHEN tr.status = 'RETURNED' AND tr.actual_return_date <= tr.expected_return_date 
                            THEN 100 ELSE 0 END) as on_time_return_rate,
                        COUNT(CASE WHEN tr.status = 'DAMAGED' THEN 1 END) as damage_incidents,
                        COALESCE(t.purchase_cost, 0) / NULLIF(COUNT(tr.id), 0) as cost_per_use
                    FROM tools t
                    LEFT JOIN tool_requests tr ON tr.tool_id = t.id 
                        AND tr.issued_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                    WHERE t.plant_id = ? AND t.status = 'ACTIVE'
                    GROUP BY t.id
                    HAVING usage_count > 0
                    ORDER BY on_time_return_rate DESC";
            
            $result = $this->db->query($sql, [$plantId])->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error fetching efficiency data: ' . $e->getMessage());
        }
    }

    // GET /api/v1/eam/tool-performance/trends
    public function trends()
    {
        try {
            $plantId = $this->request->getGet('plant_id') ?? 1;
            
            $sql = "SELECT 
                        DATE(tr.issued_date) as date,
                        COUNT(tr.id) as requests,
                        COUNT(CASE WHEN tr.status = 'RETURNED' THEN 1 END) as returns,
                        COUNT(CASE WHEN tr.actual_return_date > tr.expected_return_date THEN 1 END) as overdue
                    FROM tool_requests tr
                    JOIN tools t ON t.id = tr.tool_id
                    WHERE t.plant_id = ? 
                        AND tr.issued_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    GROUP BY DATE(tr.issued_date)
                    ORDER BY date";
            
            $result = $this->db->query($sql, [$plantId])->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error fetching trends: ' . $e->getMessage());
        }
    }

    // GET /api/v1/eam/tool-performance/optimization
    public function optimization()
    {
        try {
            $plantId = $this->request->getGet('plant_id') ?? 1;
            
            // Underutilized tools
            $underutilized = $this->db->query("
                SELECT t.id, t.name, t.code, COUNT(tr.id) as usage_count,
                       DATEDIFF(NOW(), MAX(COALESCE(tr.issued_date, t.created_at))) as days_since_last_use
                FROM tools t
                LEFT JOIN tool_requests tr ON tr.tool_id = t.id AND tr.issued_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                WHERE t.plant_id = ? AND t.status = 'ACTIVE'
                GROUP BY t.id
                HAVING usage_count < 3
                ORDER BY days_since_last_use DESC
                LIMIT 10", [$plantId])->getResultArray();
            
            // High demand tools
            $highDemand = $this->db->query("
                SELECT t.id, t.name, t.code, COUNT(tr.id) as requests,
                       COUNT(CASE WHEN tr.status = 'PENDING' THEN 1 END) as pending_requests
                FROM tools t
                JOIN tool_requests tr ON tr.tool_id = t.id
                WHERE t.plant_id = ? AND tr.request_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY t.id
                HAVING requests > 10
                ORDER BY requests DESC
                LIMIT 10", [$plantId])->getResultArray();
            
            // Maintenance heavy tools
            $maintenanceHeavy = $this->db->query("
                SELECT t.id, t.name, t.code, COUNT(tmr.id) as maintenance_count,
                       SUM(tmr.cost) as total_maintenance_cost
                FROM tools t
                JOIN tool_maintenance_records tmr ON tmr.tool_id = t.id
                WHERE t.plant_id = ? AND tmr.completed_date >= DATE_SUB(NOW(), INTERVAL 180 DAY)
                GROUP BY t.id
                HAVING maintenance_count > 2
                ORDER BY total_maintenance_cost DESC
                LIMIT 10", [$plantId])->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => [
                    'underutilized' => $underutilized,
                    'high_demand' => $highDemand,
                    'maintenance_heavy' => $maintenanceHeavy
                ]
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error fetching optimization data: ' . $e->getMessage());
        }
    }
}