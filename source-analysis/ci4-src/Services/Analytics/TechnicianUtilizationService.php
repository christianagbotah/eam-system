<?php
namespace App\Services\Analytics;

class TechnicianUtilizationService {
    protected $db;

    public function __construct() {
        $this->db = \Config\Database::connect();
    }

    public function calculateUtilization($technicianId, $startDate = null, $endDate = null) {
        $startDate = $startDate ?: date('Y-m-d', strtotime('-30 days'));
        $endDate = $endDate ?: date('Y-m-d');

        $result = $this->db->query("
            SELECT 
                SUM(actual_hours) as productive_hours,
                SUM(break_time_minutes) / 60 as break_hours,
                SUM(travel_time_minutes) / 60 as travel_hours,
                DATEDIFF(?, ?) * 8 as total_available_hours
            FROM work_executions 
            WHERE technician_id = ? AND DATE(created_at) BETWEEN ? AND ?
        ", [$endDate, $startDate, $technicianId, $startDate, $endDate])->getRow();

        $productiveHours = $result->productive_hours ?: 0;
        $totalHours = $result->total_available_hours ?: 1;
        $wrenchTime = ($productiveHours / $totalHours) * 100;

        return [
            'technician_id' => $technicianId,
            'period' => "$startDate to $endDate",
            'productive_hours' => round($productiveHours, 2),
            'break_hours' => round($result->break_hours, 2),
            'travel_hours' => round($result->travel_hours, 2),
            'total_available_hours' => $totalHours,
            'wrench_time_percent' => round($wrenchTime, 2),
            'utilization_status' => $this->getUtilizationStatus($wrenchTime)
        ];
    }

    private function getUtilizationStatus($wrenchTime) {
        if ($wrenchTime >= 75) return 'Excellent';
        if ($wrenchTime >= 60) return 'Good';
        if ($wrenchTime >= 45) return 'Fair';
        return 'Poor';
    }

    public function getAllTechniciansUtilization($startDate = null, $endDate = null) {
        $techs = $this->db->query("SELECT id FROM users WHERE role = 'technician'")->getResult();
        $results = [];
        foreach ($techs as $tech) {
            $results[] = $this->calculateUtilization($tech->id, $startDate, $endDate);
        }
        return $results;
    }
}
