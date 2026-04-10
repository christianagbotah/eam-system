<?php

namespace App\Models;

use CodeIgniter\Model;

class MobileWorkOrderModel extends Model
{
    protected $table = 'mobile_work_orders';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'work_order_id', 'technician_id', 'status', 'started_at', 'completed_at',
        'actual_hours', 'completion_notes', 'signature_data', 'offline_sync'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function getByTechnician($technicianId)
    {
        return $this->where('technician_id', $technicianId)
                    ->orderBy('created_at', 'DESC')
                    ->findAll();
    }

    public function getActiveWorkOrders($technicianId)
    {
        return $this->whereIn('status', ['assigned', 'in_progress'])
                    ->where('technician_id', $technicianId)
                    ->findAll();
    }

    public function startWork($id)
    {
        return $this->update($id, [
            'status' => 'in_progress',
            'started_at' => date('Y-m-d H:i:s')
        ]);
    }

    public function completeWork($id, $data)
    {
        return $this->update($id, [
            'status' => 'completed',
            'completed_at' => date('Y-m-d H:i:s'),
            'actual_hours' => $data['actual_hours'] ?? null,
            'completion_notes' => $data['notes'] ?? null,
            'signature_data' => $data['signature'] ?? null
        ]);
    }
}
