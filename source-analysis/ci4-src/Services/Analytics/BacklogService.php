<?php
namespace App\Services\Analytics;

class BacklogService {
    protected $db;

    public function __construct() {
        $this->db = \Config\Database::connect();
    }

    public function getBacklogAging() {
        $result = $this->db->query("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN DATEDIFF(NOW(), created_at) <= 7 THEN 1 ELSE 0 END) as days_0_7,
                SUM(CASE WHEN DATEDIFF(NOW(), created_at) BETWEEN 8 AND 30 THEN 1 ELSE 0 END) as days_8_30,
                SUM(CASE WHEN DATEDIFF(NOW(), created_at) BETWEEN 31 AND 90 THEN 1 ELSE 0 END) as days_31_90,
                SUM(CASE WHEN DATEDIFF(NOW(), created_at) > 90 THEN 1 ELSE 0 END) as days_90_plus
            FROM work_orders 
            WHERE status IN ('Open', 'Assigned', 'InProgress')
        ")->getRow();

        return [
            'total_backlog' => $result->total,
            'aging' => [
                '0-7 days' => $result->days_0_7,
                '8-30 days' => $result->days_8_30,
                '31-90 days' => $result->days_31_90,
                '90+ days (RED FLAG)' => $result->days_90_plus
            ],
            'health_status' => $result->days_90_plus > 0 ? 'Critical' : ($result->days_31_90 > 5 ? 'Warning' : 'Good')
        ];
    }

    public function getBacklogByPriority() {
        $result = $this->db->query("
            SELECT priority, COUNT(*) as count, AVG(DATEDIFF(NOW(), created_at)) as avg_age
            FROM work_orders 
            WHERE status IN ('Open', 'Assigned', 'InProgress')
            GROUP BY priority
        ")->getResult();

        return $result;
    }
}
