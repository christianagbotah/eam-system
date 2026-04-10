<?php

namespace App\Models;

use CodeIgniter\Model;

class PmWorkOrderModel extends Model
{
    protected $table = 'pm_work_orders';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_number', 'schedule_id', 'equipment_id', 'part_id', 
        'task_name', 'task_description', 'priority', 'status', 'assigned_to',
        'scheduled_date', 'completed_date', 'estimated_duration_minutes',
        'actual_duration_minutes', 'notes', 'completion_notes'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $beforeInsert = ['generateWorkOrderNumber'];

    protected function generateWorkOrderNumber(array $data)
    {
        if (empty($data['data']['work_order_number'])) {
            $prefix = 'WO-' . date('Ymd') . '-';
            
            $lastOrder = $this->select('work_order_number')
                ->like('work_order_number', $prefix, 'after')
                ->orderBy('work_order_number', 'DESC')
                ->first();
            
            if ($lastOrder) {
                $lastNumber = intval(substr($lastOrder['work_order_number'], -4));
                $newNumber = $lastNumber + 1;
            } else {
                $newNumber = 1;
            }
            
            $data['data']['work_order_number'] = $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
        }
        
        return $data;
    }

    public function getWorkOrdersByEquipment($equipmentId, $status = null)
    {
        $builder = $this->db->table('pm_work_orders wo')
            ->select('wo.*, p.name as part_name, p.part_number, 
                     e.name as equipment_name, e.equipment_id,
                     u.username as assigned_to_name')
            ->join('parts p', 'wo.part_id = p.id')
            ->join('equipment e', 'wo.equipment_id = e.id')
            ->join('users u', 'wo.assigned_to = u.id', 'left')
            ->where('wo.equipment_id', $equipmentId);

        if ($status) {
            $builder->where('wo.status', $status);
        }

        return $builder->orderBy('wo.scheduled_date', 'ASC')
            ->orderBy('wo.priority', 'DESC')
            ->get()->getResultArray();
    }

    public function generateWorkOrdersFromSchedules($equipmentId = null)
    {
        $scheduleModel = new PmScheduleNewModel();
        $dueSchedules = $scheduleModel->getDueSchedules($equipmentId);

        $workOrders = [];
        foreach ($dueSchedules as $schedule) {
            // Check if work order already exists for this schedule
            $existing = $this->where('schedule_id', $schedule['id'])
                ->whereIn('status', ['pending', 'assigned', 'in_progress'])
                ->first();

            if (!$existing) {
                $workOrders[] = [
                    'schedule_id' => $schedule['id'],
                    'equipment_id' => $schedule['equipment_id'],
                    'part_id' => $schedule['part_id'],
                    'task_name' => $schedule['task_name'],
                    'task_description' => $schedule['task_description'],
                    'priority' => $schedule['priority'],
                    'scheduled_date' => $schedule['next_due_date'],
                    'estimated_duration_minutes' => $schedule['estimated_duration_minutes'],
                    'status' => 'pending'
                ];
            }
        }

        if (!empty($workOrders)) {
            return $this->insertBatch($workOrders);
        }

        return 0;
    }

    public function completeWorkOrder($workOrderId, $data)
    {
        $workOrder = $this->find($workOrderId);
        if (!$workOrder) return false;

        // Update work order
        $updateData = [
            'status' => 'completed',
            'completed_date' => $data['completed_date'] ?? date('Y-m-d'),
            'actual_duration_minutes' => $data['actual_duration_minutes'] ?? null,
            'completion_notes' => $data['completion_notes'] ?? null
        ];

        $this->update($workOrderId, $updateData);

        // Update schedule
        $scheduleModel = new PmScheduleNewModel();
        $nextDueDate = $scheduleModel->calculateNextDueDate($workOrder['schedule_id']);
        
        $scheduleModel->update($workOrder['schedule_id'], [
            'last_completed_date' => $updateData['completed_date'],
            'next_due_date' => $nextDueDate,
            'status' => 'scheduled'
        ]);

        return true;
    }
}
