<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;

class CompletionAnalyticsController extends BaseResourceController
{
    protected $format = 'json';

    public function workOrderStats()
    {
        $db = \Config\Database::connect();
        
        $stats = [
            'total_completed' => $db->table('work_order_completion_reports')->where('report_status', 'approved')->countAllResults(),
            'avg_completion_time' => $db->table('work_order_completion_reports')->selectAvg('total_hours')->get()->getRow()->total_hours,
            'by_technician' => $db->query("
                SELECT u.name, COUNT(*) as count, SUM(t.actual_hours) as total_hours
                FROM technician_time_logs t
                JOIN users u ON u.id = t.technician_id
                WHERE t.status = 'completed'
                GROUP BY t.technician_id
            ")->getResultArray()
        ];
        
        return $this->respond(['status' => 'success', 'data' => $stats]);
    }

    public function permitStats()
    {
        $db = \Config\Database::connect();
        
        $stats = [
            'total_permits' => $db->table('permits_to_work')->countAllResults(),
            'active' => $db->table('permits_to_work')->where('status', 'active')->countAllResults(),
            'by_type' => $db->query("
                SELECT permit_type, COUNT(*) as count
                FROM permits_to_work
                GROUP BY permit_type
            ")->getResultArray(),
            'by_risk' => $db->query("
                SELECT risk_level, COUNT(*) as count
                FROM permits_to_work
                GROUP BY risk_level
            ")->getResultArray()
        ];
        
        return $this->respond(['status' => 'success', 'data' => $stats]);
    }

    public function lotoStats()
    {
        $db = \Config\Database::connect();
        
        $stats = [
            'total_procedures' => $db->table('loto_procedures')->where('active', true)->countAllResults(),
            'active_lockouts' => $db->table('loto_applications')->where('status', 'active')->countAllResults(),
            'by_equipment' => $db->query("
                SELECT e.name as equipment_name, COUNT(*) as lockout_count
                FROM loto_applications l
                JOIN assets e ON e.id = l.equipment_id
                WHERE l.status IN ('applied', 'verified', 'active')
                GROUP BY l.equipment_id
            ")->getResultArray()
        ];
        
        return $this->respond(['status' => 'success', 'data' => $stats]);
    }
}
