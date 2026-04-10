<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\Api\V1\BaseResourceController;

class PmWorkOrderController extends BaseResourceController
{
    protected $format = 'json';

    public function generateFromDueTasks()
    {
        $db = \Config\Database::connect();
        $today = date('Y-m-d');
        $dueSoonDate = date('Y-m-d', strtotime('+7 days'));
        
        // Get PM tasks that are due or due soon
        $dueTasks = $db->table('part_pm_tasks')
            ->select('part_pm_tasks.*, pm_tasks.task_name, pm_tasks.task_description')
            ->join('pm_tasks', 'pm_tasks.task_id = part_pm_tasks.pm_task_id')
            ->where('part_pm_tasks.is_active', 1)
            ->where('part_pm_tasks.next_due_date <=', $dueSoonDate)
            ->whereNotIn('part_pm_tasks.id', function($builder) {
                $builder->select('part_pm_task_id')
                    ->from('pm_work_orders')
                    ->whereIn('status', ['pending', 'assigned', 'in_progress']);
            })
            ->get()
            ->getResultArray();

        $generated = 0;
        foreach ($dueTasks as $task) {
            $woNumber = 'PM-' . date('Ymd') . '-' . str_pad($task['id'], 5, '0', STR_PAD_LEFT);
            
            $workOrderData = [
                'part_pm_task_id' => $task['id'],
                'part_id' => $task['part_id'],
                'work_order_number' => $woNumber,
                'title' => $task['task_name'],
                'description' => $task['task_description'],
                'priority' => $this->calculatePriority($task['next_due_date']),
                'status' => 'pending',
                'scheduled_date' => $task['next_due_date'],
                'due_date' => date('Y-m-d', strtotime($task['next_due_date'] . ' +3 days')),
                'estimated_duration' => $task['estimated_duration']
            ];
            
            $db->table('pm_work_orders')->insert($workOrderData);
            $woId = $db->insertID();
            
            // Create default checklist items
            $this->createDefaultChecklist($woId, $task);
            
            // Send notifications
            $this->sendNotifications($task, $woId);
            
            $generated++;
        }

        return $this->respond([
            'status' => 'success',
            'message' => "{$generated} work orders generated",
            'data' => ['generated' => $generated]
        ]);
    }

    private function calculatePriority($dueDate)
    {
        $daysUntilDue = (strtotime($dueDate) - time()) / 86400;
        if ($daysUntilDue < 0) return 'critical';
        if ($daysUntilDue <= 2) return 'high';
        if ($daysUntilDue <= 5) return 'medium';
        return 'low';
    }

    private function createDefaultChecklist($woId, $task)
    {
        $db = \Config\Database::connect();
        $items = [
            'Inspect component condition',
            'Check for wear and damage',
            'Perform required maintenance',
            'Test functionality',
            'Document findings'
        ];
        
        foreach ($items as $index => $item) {
            $db->table('pm_checklist_items')->insert([
                'pm_work_order_id' => $woId,
                'item_description' => $item,
                'item_order' => $index + 1
            ]);
        }
    }

    private function sendNotifications($task, $woId)
    {
        $db = \Config\Database::connect();
        $daysUntilDue = (strtotime($task['next_due_date']) - time()) / 86400;
        
        $notificationType = $daysUntilDue < 0 ? 'overdue' : 'due_soon';
        $message = $daysUntilDue < 0 
            ? "PM task is overdue: {$task['task_name']}"
            : "PM task due in " . ceil($daysUntilDue) . " days: {$task['task_name']}";
        
        // Notify admin and planner
        foreach (['admin', 'planner'] as $role) {
            $db->table('pm_notifications')->insert([
                'notification_type' => $notificationType,
                'part_pm_task_id' => $task['id'],
                'pm_work_order_id' => $woId,
                'recipient_role' => $role,
                'title' => 'PM Work Order Generated',
                'message' => $message
            ]);
        }
    }

    public function index()
    {
        $db = \Config\Database::connect();
        $status = $this->request->getGet('status');
        
        $builder = $db->table('pm_work_orders')
            ->select('pm_work_orders.*, pm_tasks.task_name, parts.part_name')
            ->join('part_pm_tasks', 'part_pm_tasks.id = pm_work_orders.part_pm_task_id')
            ->join('pm_tasks', 'pm_tasks.task_id = part_pm_tasks.pm_task_id')
            ->join('parts', 'parts.id = pm_work_orders.part_id', 'left')
            ->orderBy('pm_work_orders.due_date', 'ASC');
        
        if ($status) {
            $builder->where('pm_work_orders.status', $status);
        }
        
        $workOrders = $builder->get()->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $workOrders
        ]);
    }

    public function show($id = null)
    {
        $db = \Config\Database::connect();
        $wo = $db->table('pm_work_orders')
            ->select('pm_work_orders.*, pm_tasks.task_name, pm_tasks.task_description, parts.part_name, parts.part_number')
            ->join('part_pm_tasks', 'part_pm_tasks.id = pm_work_orders.part_pm_task_id')
            ->join('pm_tasks', 'pm_tasks.task_id = part_pm_tasks.pm_task_id')
            ->join('parts', 'parts.id = pm_work_orders.part_id', 'left')
            ->where('pm_work_orders.id', $id)
            ->get()
            ->getRowArray();
        
        if (!$wo) {
            return $this->failNotFound('Work order not found');
        }
        
        // Get checklist items (if table exists)
        try {
            $wo['checklist'] = $db->table('pm_checklist_items')
                ->where('pm_work_order_id', $id)
                ->orderBy('item_order', 'ASC')
                ->get()
                ->getResultArray();
        } catch (\Exception $e) {
            $wo['checklist'] = [];
        }
        
        // Get execution parameters (if table exists)
        try {
            $wo['parameters'] = $db->table('pm_execution_parameters')
                ->where('pm_work_order_id', $id)
                ->get()
                ->getResultArray();
        } catch (\Exception $e) {
            $wo['parameters'] = [];
        }
        
        return $this->respond([
            'status' => 'success',
            'data' => $wo
        ]);
    }

    public function assign($id)
    {
        $data = $this->request->getJSON(true);
        $technicianId = $data['technician_id'] ?? null;
        
        if (!$technicianId) {
            return $this->fail('Technician ID required', 400);
        }
        
        $db = \Config\Database::connect();
        $updated = $db->table('pm_work_orders')
            ->where('id', $id)
            ->update([
                'assigned_to' => $technicianId,
                'assigned_at' => date('Y-m-d H:i:s'),
                'status' => 'assigned'
            ]);
        
        if ($updated) {
            // Notify technician
            $wo = $db->table('pm_work_orders')->where('id', $id)->get()->getRowArray();
            $db->table('pm_notifications')->insert([
                'notification_type' => 'assigned',
                'part_pm_task_id' => $wo['part_pm_task_id'],
                'pm_work_order_id' => $id,
                'recipient_role' => 'technician',
                'recipient_user_id' => $technicianId,
                'title' => 'PM Work Order Assigned',
                'message' => "You have been assigned work order: {$wo['work_order_number']}"
            ]);
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Work order assigned successfully'
            ]);
        }
        
        return $this->fail('Failed to assign work order', 500);
    }

    public function updateStatus($id)
    {
        $data = $this->request->getJSON(true);
        $status = $data['status'] ?? null;
        
        $db = \Config\Database::connect();
        $updateData = ['status' => $status];
        
        if ($status === 'in_progress') {
            $updateData['started_at'] = date('Y-m-d H:i:s');
        } elseif ($status === 'completed') {
            $updateData['completed_at'] = date('Y-m-d H:i:s');
            
            // Update next due date for the PM task
            $wo = $db->table('pm_work_orders')->where('id', $id)->get()->getRowArray();
            $this->updateNextDueDate($wo['part_pm_task_id']);
        }
        
        $db->table('pm_work_orders')->where('id', $id)->update($updateData);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Status updated successfully'
        ]);
    }

    private function updateNextDueDate($partPmTaskId)
    {
        $db = \Config\Database::connect();
        $task = $db->table('part_pm_tasks')->where('id', $partPmTaskId)->get()->getRowArray();
        
        $nextDue = date('Y-m-d', strtotime("+{$task['frequency_value']} days"));
        
        $db->table('part_pm_tasks')->where('id', $partPmTaskId)->update([
            'last_performed_date' => date('Y-m-d H:i:s'),
            'next_due_date' => $nextDue
        ]);
    }

    public function saveParameters($id)
    {
        $data = $this->request->getJSON(true);
        $parameters = $data['parameters'] ?? [];
        
        $db = \Config\Database::connect();
        
        foreach ($parameters as $param) {
            $db->table('pm_execution_parameters')->insert([
                'pm_work_order_id' => $id,
                'parameter_name' => $param['name'],
                'parameter_value' => $param['value'],
                'parameter_unit' => $param['unit'] ?? null,
                'expected_value' => $param['expected'] ?? null,
                'status' => $param['status'] ?? 'normal',
                'notes' => $param['notes'] ?? null,
                'recorded_by' => $data['technician_id'],
                'recorded_at' => date('Y-m-d H:i:s')
            ]);
        }
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Parameters saved successfully'
        ]);
    }

    public function updateChecklist($id)
    {
        $data = $this->request->getJSON(true);
        $itemId = $data['item_id'];
        $isCompleted = $data['is_completed'];
        
        $db = \Config\Database::connect();
        $updateData = [
            'is_completed' => $isCompleted,
            'completed_at' => $isCompleted ? date('Y-m-d H:i:s') : null,
            'completed_by' => $isCompleted ? $data['technician_id'] : null,
            'notes' => $data['notes'] ?? null
        ];
        
        $db->table('pm_checklist_items')->where('id', $itemId)->update($updateData);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Checklist updated'
        ]);
    }
}
