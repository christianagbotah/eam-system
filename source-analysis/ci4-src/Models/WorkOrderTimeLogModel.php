<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderTimeLogModel extends Model
{
    protected $table = 'work_order_time_logs';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'work_order_id', 'technician_id', 'log_type', 'timestamp',
        'duration_minutes', 'location', 'notes', 'gps_coordinates'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'technician_id' => 'required|integer',
        'log_type' => 'required|in_list[start,pause,resume,complete]',
        'timestamp' => 'required'
    ];

    public function getTechnicianLogs($workOrderId, $technicianId)
    {
        return $this->where(['work_order_id' => $workOrderId, 'technician_id' => $technicianId])
            ->orderBy('timestamp', 'ASC')
            ->findAll();
    }

    public function calculateWorkDuration($workOrderId, $technicianId)
    {
        $logs = $this->getTechnicianLogs($workOrderId, $technicianId);
        $totalMinutes = 0;
        $lastStart = null;

        foreach ($logs as $log) {
            if (in_array($log['log_type'], ['start', 'resume'])) {
                $lastStart = strtotime($log['timestamp']);
            } elseif (in_array($log['log_type'], ['pause', 'complete']) && $lastStart) {
                $totalMinutes += (strtotime($log['timestamp']) - $lastStart) / 60;
                $lastStart = null;
            }
        }

        return round($totalMinutes / 60, 2); // Return hours
    }
}
