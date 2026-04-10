<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseResourceController;

class SchedulerController extends BaseResourceController
{
    protected $format = 'json';

    public function getTasks()
    {
        $date = $this->request->getGet('date') ?? date('Y-m-d');
        $view = $this->request->getGet('view') ?? 'week';
        
        $db = \Config\Database::connect();
        
        $startDate = $date;
        $endDate = $date;
        
        if ($view === 'week') {
            $endDate = date('Y-m-d', strtotime($date . ' +7 days'));
        } elseif ($view === 'month') {
            $endDate = date('Y-m-d', strtotime($date . ' +30 days'));
        }
        
        $query = "SELECT 
            s.id,
            s.work_order_id,
            w.title,
            a.name as asset_name,
            s.technician_id,
            u.username as technician_name,
            s.scheduled_start,
            s.scheduled_end,
            s.estimated_hours,
            s.status,
            w.priority
        FROM work_order_schedules s
        JOIN work_orders w ON s.work_order_id = w.id
        LEFT JOIN assets a ON w.asset_id = a.id
        LEFT JOIN users u ON s.technician_id = u.id
        WHERE s.scheduled_start BETWEEN ? AND ?
        ORDER BY s.scheduled_start";
        
        $tasks = $db->query($query, [$startDate, $endDate])->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $tasks]);
    }

    public function getResources()
    {
        $db = \Config\Database::connect();
        
        $query = "SELECT 
            u.id,
            u.username as name,
            r.name as role,
            40 as hours_available,
            COALESCE(SUM(s.estimated_hours), 0) as hours_scheduled
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        LEFT JOIN work_order_schedules s ON u.id = s.technician_id 
            AND s.scheduled_start >= CURDATE() 
            AND s.scheduled_start < DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        WHERE r.name IN ('technician', 'supervisor')
        GROUP BY u.id";
        
        $resources = $db->query($query)->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $resources]);
    }

    public function schedule()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $estimatedHours = $data['estimated_hours'];
        $scheduledStart = $data['scheduled_start'];
        $scheduledEnd = date('Y-m-d H:i:s', strtotime($scheduledStart . " +{$estimatedHours} hours"));
        
        if ($this->checkConflict($data['technician_id'], $scheduledStart, $scheduledEnd)) {
            return $this->fail('Scheduling conflict detected');
        }
        
        $db->table('work_order_schedules')->insert([
            'work_order_id' => $data['work_order_id'],
            'technician_id' => $data['technician_id'],
            'scheduled_start' => $scheduledStart,
            'scheduled_end' => $scheduledEnd,
            'estimated_hours' => $estimatedHours,
            'status' => 'scheduled',
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        $db->table('work_orders')->update(['status' => 'scheduled'], ['id' => $data['work_order_id']]);
        
        return $this->respond(['status' => 'success', 'message' => 'Task scheduled']);
    }

    public function reschedule($id = null)
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $scheduledEnd = date('Y-m-d H:i:s', strtotime($data['scheduled_start'] . " +{$data['estimated_hours']} hours"));
        
        $db->table('work_order_schedules')->update([
            'scheduled_start' => $data['scheduled_start'],
            'scheduled_end' => $scheduledEnd,
            'technician_id' => $data['technician_id']
        ], ['id' => $id]);
        
        return $this->respond(['status' => 'success', 'message' => 'Task rescheduled']);
    }

    public function getCapacity()
    {
        $date = $this->request->getGet('date') ?? date('Y-m-d');
        $db = \Config\Database::connect();
        
        $query = "SELECT 
            DATE(scheduled_start) as date,
            COUNT(*) as tasks_count,
            SUM(estimated_hours) as total_hours,
            COUNT(DISTINCT technician_id) as technicians_assigned
        FROM work_order_schedules
        WHERE scheduled_start >= ? AND scheduled_start < DATE_ADD(?, INTERVAL 7 DAY)
        GROUP BY DATE(scheduled_start)";
        
        $capacity = $db->query($query, [$date, $date])->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $capacity]);
    }

    private function checkConflict($technicianId, $start, $end)
    {
        $db = \Config\Database::connect();
        
        $query = "SELECT COUNT(*) as count FROM work_order_schedules 
                  WHERE technician_id = ? 
                  AND ((scheduled_start BETWEEN ? AND ?) 
                  OR (scheduled_end BETWEEN ? AND ?))";
        
        $result = $db->query($query, [$technicianId, $start, $end, $start, $end])->getRow();
        
        return $result->count > 0;
    }
}
