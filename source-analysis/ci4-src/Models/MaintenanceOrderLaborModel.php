<?php

namespace App\Models;

use CodeIgniter\Model;

class MaintenanceOrderLaborModel extends Model
{
    protected $table = 'maintenance_order_labor';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'maintenance_order_id', 'technician_id', 'technician_name', 'role',
        'start_time', 'end_time', 'hours_worked', 'hourly_rate', 'labor_cost',
        'work_description', 'break_time_minutes', 'overtime_hours'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';

    protected $beforeInsert = ['calculateHoursAndCost'];
    protected $beforeUpdate = ['calculateHoursAndCost'];

    protected function calculateHoursAndCost(array $data)
    {
        if (isset($data['data']['start_time']) && isset($data['data']['end_time'])) {
            $start = strtotime($data['data']['start_time']);
            $end = strtotime($data['data']['end_time']);
            $breakMinutes = $data['data']['break_time_minutes'] ?? 0;
            
            $totalMinutes = ($end - $start) / 60 - $breakMinutes;
            $data['data']['hours_worked'] = round($totalMinutes / 60, 2);

            if (isset($data['data']['hourly_rate'])) {
                $data['data']['labor_cost'] = $data['data']['hours_worked'] * $data['data']['hourly_rate'];
            }
        }

        return $data;
    }

    public function getLaborByOrder($orderId)
    {
        return $this->where('maintenance_order_id', $orderId)->findAll();
    }

    public function getTotalLaborCost($orderId)
    {
        $result = $this->selectSum('labor_cost')
            ->where('maintenance_order_id', $orderId)
            ->first();
        
        return $result['labor_cost'] ?? 0;
    }
}
