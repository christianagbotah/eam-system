<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Labor Log Model
 * Tracks technician labor hours on work orders
 * ISO 55000 Compliant
 */
class LaborLogModel extends Model
{
    protected $table = 'labor_logs';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id',
        'technician_id',
        'clock_in',
        'clock_out',
        'break_minutes',
        'actual_hours',
        'work_type',
        'activity_description',
        'labor_type',
        'notes'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'technician_id' => 'required|integer',
        'clock_in' => 'required',
        'work_type' => 'in_list[diagnosis,repair,testing,documentation,other]'
    ];

    /**
     * Calculate duration when end_time is set
     */
    protected $beforeInsert = ['calculateDuration'];
    protected $beforeUpdate = ['calculateDuration'];

    protected function calculateDuration(array $data)
    {
        if (isset($data['data']['clock_in']) && isset($data['data']['clock_out'])) {
            $start = strtotime($data['data']['clock_in']);
            $end = strtotime($data['data']['clock_out']);
            $hours = ($end - $start) / 3600;
            $breakHours = isset($data['data']['break_minutes']) ? $data['data']['break_minutes'] / 60 : 0;
            $data['data']['actual_hours'] = round($hours - $breakHours, 2);
        }
        return $data;
    }

    public function getByWorkOrder($workOrderId)
    {
        return $this->select('labor_logs.*, users.name as technician_name')
            ->join('users', 'users.id = labor_logs.technician_id', 'left')
            ->where('work_order_id', $workOrderId)
            ->orderBy('clock_in', 'DESC')
            ->findAll();
    }

    public function getTotalHours($workOrderId)
    {
        $result = $this->selectSum('actual_hours')
            ->where('work_order_id', $workOrderId)
            ->first();
        return $result['actual_hours'] ?? 0;
    }
}
