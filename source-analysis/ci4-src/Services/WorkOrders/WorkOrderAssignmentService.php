<?php

namespace App\Services\WorkOrders;

use App\Models\WorkOrder;

class WorkOrderAssignmentService
{
    protected $workOrderModel;

    public function __construct()
    {
        $this->workOrderModel = new WorkOrder();
    }

    public function assignToUser(int $workOrderId, int $userId, int $assignedBy): array
    {
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            $workOrder = $this->workOrderModel->find($workOrderId);
            if (!$workOrder) {
                throw new \Exception('Work order not found');
            }

            $this->workOrderModel->update($workOrderId, [
                'assigned_user_id' => $userId,
                'status' => 'assigned'
            ]);

            // Log the assignment
            $db->table('work_order_logs')->insert([
                'work_order_id' => $workOrderId,
                'user_id' => $assignedBy,
                'action' => 'assigned',
                'old_status' => $workOrder['status'],
                'new_status' => 'assigned',
                'notes' => "Assigned to user ID: $userId",
                'created_at' => date('Y-m-d H:i:s')
            ]);

            $db->transCommit();
            return $this->workOrderModel->find($workOrderId);
        } catch (\Exception $e) {
            $db->transRollback();
            throw $e;
        }
    }

    public function assignToGroup(int $workOrderId, int $groupId, int $assignedBy): array
    {
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            $workOrder = $this->workOrderModel->find($workOrderId);
            if (!$workOrder) {
                throw new \Exception('Work order not found');
            }

            $this->workOrderModel->update($workOrderId, [
                'assigned_group_id' => $groupId,
                'status' => 'assigned'
            ]);

            $db->table('work_order_logs')->insert([
                'work_order_id' => $workOrderId,
                'user_id' => $assignedBy,
                'action' => 'assigned',
                'old_status' => $workOrder['status'],
                'new_status' => 'assigned',
                'notes' => "Assigned to group ID: $groupId",
                'created_at' => date('Y-m-d H:i:s')
            ]);

            $db->transCommit();
            return $this->workOrderModel->find($workOrderId);
        } catch (\Exception $e) {
            $db->transRollback();
            throw $e;
        }
    }
}