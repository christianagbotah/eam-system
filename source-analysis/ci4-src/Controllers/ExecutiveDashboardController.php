<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;

class ExecutiveDashboardController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        
        // OEE Summary
        $oee = $db->query("SELECT AVG(oee) as avg_oee, AVG(availability) as avg_avail, AVG(performance) as avg_perf, AVG(quality) as avg_qual FROM oee_metrics WHERE shift_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)")->getRowArray();
        
        // Asset Health
        $assets = $db->query("SELECT COUNT(*) as total, SUM(CASE WHEN status='operational' THEN 1 ELSE 0 END) as operational FROM assets")->getRowArray();
        
        // Work Orders
        $workOrders = $db->query("SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status='overdue' THEN 1 ELSE 0 END) as overdue FROM work_orders WHERE MONTH(created_at) = MONTH(CURDATE())")->getRowArray();
        
        // Skills Coverage
        $skills = $db->query("SELECT COUNT(DISTINCT skill_id) as total_skills, COUNT(CASE WHEN proficiency_level >= 3 THEN 1 END) as qualified FROM user_skills")->getRowArray();
        
        // Costs
        $costs = $db->query("SELECT SUM(cost) as total_cost FROM work_orders WHERE MONTH(created_at) = MONTH(CURDATE())")->getRowArray();
        
        // Downtime
        $downtime = $db->query("SELECT SUM(duration_minutes) as total_minutes FROM oee_downtime_events WHERE DATE(start_time) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)")->getRowArray();
        
        return $this->respond([
            'success' => true,
            'data' => [
                'oee' => $oee,
                'assets' => $assets,
                'work_orders' => $workOrders,
                'skills' => $skills,
                'costs' => $costs,
                'downtime' => $downtime,
            ]
        ]);
    }

    public function trends()
    {
        $db = \Config\Database::connect();
        $days = $this->request->getGet('days') ?? 30;
        
        $oee = $db->query("SELECT shift_date, AVG(oee) as avg_oee FROM oee_metrics WHERE shift_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY shift_date ORDER BY shift_date", [$days])->getResultArray();
        
        return $this->respond(['success' => true, 'data' => $oee]);
    }

    public function alerts()
    {
        $db = \Config\Database::connect();
        
        $alerts = [];
        
        // Low OEE
        $lowOee = $db->query("SELECT asset_id, AVG(oee) as avg_oee FROM oee_metrics WHERE shift_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY asset_id HAVING avg_oee < 70")->getResultArray();
        foreach ($lowOee as $a) {
            $alerts[] = ['type' => 'critical', 'message' => "Asset {$a['asset_id']} OEE below 70%: {$a['avg_oee']}%"];
        }
        
        // Skill Gaps
        $gaps = $db->query("SELECT s.name, COUNT(us.id) as qualified FROM skills s LEFT JOIN user_skills us ON s.id = us.skill_id AND us.proficiency_level >= 3 GROUP BY s.id HAVING qualified < 2")->getResultArray();
        foreach ($gaps as $g) {
            $alerts[] = ['type' => 'warning', 'message' => "Critical skill gap: {$g['name']} ({$g['qualified']} qualified)"];
        }
        
        return $this->respond(['success' => true, 'data' => $alerts]);
    }
}
