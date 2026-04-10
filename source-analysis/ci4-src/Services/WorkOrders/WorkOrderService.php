<?php

namespace App\Services\WorkOrders;

use App\Models\WorkOrderModel;

class WorkOrderService
{
    protected $woModel;
    protected $logService;

    public function __construct()
    {
        $this->woModel = new WorkOrderModel();
        $this->logService = new WOLogService();
    }

    public function createFromRequest($payload, $type)
    {
        $metaModel = model('App\Models\WorkOrderTypesMetaModel');
        $meta = $metaModel->where('work_order_type', $type)->first();
        
        $data = [
            'wo_number' => $this->woModel->generateWoNumber(),
            'type' => $type,
            'title' => $payload['title'],
            'description' => $payload['description'] ?? null,
            'asset_id' => $payload['asset_id'] ?? null,
            'requestor_id' => $payload['requestor_id'],
            'priority' => $payload['priority'] ?? $meta['default_priority'] ?? 'medium',
            'status' => 'requested',
            'sla_hours' => $meta['default_sla_hours'] ?? null,
        ];

        if (in_array($type, ['breakdown', 'emergency'])) {
            $data['status'] = 'approved';
            $data['priority'] = 'critical';
            $data['sla_started_at'] = date('Y-m-d H:i:s');
        }

        $woId = $this->woModel->insert($data);
        $this->logService->logAction($woId, $payload['requestor_id'], 'created', $data);

        if (in_array($type, ['breakdown', 'emergency'])) {
            $this->notifyUrgent($woId);
        }

        return $woId;
    }

    public function createFromPM($pmScheduleId)
    {
        $pmModel = model('App\Models\PmScheduleModel');
        $pm = $pmModel->find($pmScheduleId);
        
        $data = [
            'wo_number' => $this->woModel->generateWoNumber(),
            'type' => 'corrective',
            'title' => 'PM: ' . $pm['title'],
            'description' => 'Auto-generated from PM schedule',
            'asset_id' => $pm['asset_id'],
            'related_pm_id' => $pmScheduleId,
            'requestor_id' => 1,
            'priority' => 'medium',
            'status' => 'approved',
            'sla_hours' => 24,
        ];

        $woId = $this->woModel->insert($data);
        $this->logService->logAction($woId, 1, 'created_from_pm', ['pm_schedule_id' => $pmScheduleId]);

        return $woId;
    }

    public function assignToUser($workOrderId, $userId, $assignedBy)
    {
        $this->woModel->update($workOrderId, [
            'assigned_user_id' => $userId,
            'status' => 'assigned'
        ]);
        $this->logService->logAction($workOrderId, $assignedBy, 'assigned', ['assigned_user_id' => $userId]);
    }

    public function start($workOrderId, $userId)
    {
        $wo = $this->woModel->find($workOrderId);
        $this->woModel->update($workOrderId, [
            'status' => 'in_progress',
            'actual_start' => date('Y-m-d H:i:s'),
            'sla_started_at' => $wo['sla_started_at'] ?? date('Y-m-d H:i:s')
        ]);
        $this->logService->logAction($workOrderId, $userId, 'started', []);
    }

    public function pause($workOrderId, $userId, $reason)
    {
        $this->woModel->update($workOrderId, ['status' => 'on_hold']);
        $this->logService->logAction($workOrderId, $userId, 'paused', ['reason' => $reason]);
    }

    public function complete($workOrderId, $userId, $completionPayload)
    {
        $wo = $this->woModel->find($workOrderId);
        $actualEnd = date('Y-m-d H:i:s');
        
        // Use provided actual_hours or calculate from start time
        $actualHours = $completionPayload['actual_hours'] ?? null;
        if (!$actualHours && $wo['actual_start']) {
            $start = strtotime($wo['actual_start']);
            $end = strtotime($actualEnd);
            $actualHours = round(($end - $start) / 3600, 2);
        }

        // Update work order using direct database query
        $db = \Config\Database::connect();
        $db->table('work_orders')->where('id', $workOrderId)->update([
            'status' => 'completed',
            'actual_end' => $actualEnd,
            'actual_hours' => $actualHours
        ]);

        // Save checklist items if provided
        if (isset($completionPayload['checklist']) && is_array($completionPayload['checklist'])) {
            $db = \Config\Database::connect();
            foreach ($completionPayload['checklist'] as $item) {
                $db->table('work_order_checklist_items')->insert([
                    'work_order_id' => $workOrderId,
                    'item_id' => $item['item_id'],
                    'value' => $item['value'],
                    'completed_by' => $userId,
                    'completed_at' => $actualEnd
                ]);
            }
        }

        // Log action directly
        $db->table('work_order_logs')->insert([
            'work_order_id' => $workOrderId,
            'user_id' => $userId,
            'action' => 'completed',
            'details' => json_encode($completionPayload),
            'created_at' => $actualEnd
        ]);
        
        // Return updated work order using direct query
        return $db->table('work_orders')->where('id', $workOrderId)->get()->getRowArray();
    }

    public function reopen($workOrderId, $userId, $reason)
    {
        $this->woModel->update($workOrderId, ['status' => 'assigned']);
        $this->logService->logAction($workOrderId, $userId, 'reopened', ['reason' => $reason]);
    }

    public function markWaitingParts($workOrderId, $details)
    {
        $this->woModel->update($workOrderId, ['status' => 'waiting_parts']);
        $this->logService->logAction($workOrderId, $details['user_id'], 'waiting_parts', $details);
    }

    public function slaCheckAndNotify()
    {
        $wos = $this->woModel->where('status !=', 'completed')
            ->where('status !=', 'closed')
            ->where('status !=', 'cancelled')
            ->whereNotNull('sla_started_at')
            ->whereNull('sla_breached_at')
            ->findAll();

        foreach ($wos as $wo) {
            $slaEnd = strtotime($wo['sla_started_at']) + ($wo['sla_hours'] * 3600);
            if (time() > $slaEnd) {
                $this->woModel->update($wo['id'], ['sla_breached_at' => date('Y-m-d H:i:s')]);
                $this->logService->logAction($wo['id'], 1, 'sla_breached', []);
            }
        }
    }

    protected function notifyUrgent($woId)
    {
        log_message('info', "Urgent WO notification sent for WO ID: {$woId}");
    }

    public function createFromPmSchedule(int $pmScheduleId, int $plannerId): array
    {
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            // Get PM schedule with template details
            $schedule = $db->table('pm_schedules ps')
                ->select('ps.*, pt.title, pt.description, pt.asset_node_type, pt.asset_node_id, pt.priority, pt.estimated_hours')
                ->join('pm_templates pt', 'pt.id = ps.pm_template_id')
                ->where('ps.id', $pmScheduleId)
                ->get()->getRowArray();

            if (!$schedule) {
                throw new \Exception('PM Schedule not found');
            }

            // Generate work order code
            $woCode = $this->woModel->generateWoNumber();

            // Create work order
            $workOrderData = [
                'wo_number' => $woCode,
                'title' => 'PM: ' . $schedule['title'],
                'description' => $schedule['description'],
                'type' => 'preventive',
                'priority' => $schedule['priority'],
                'status' => 'assigned',
                'estimated_hours' => $schedule['estimated_hours'],
                'related_pm_id' => $pmScheduleId,
                'asset_id' => $schedule['asset_node_id'],
                'requestor_id' => $plannerId,
                'sla_hours' => 24
            ];

            $workOrderId = $this->woModel->insert($workOrderData);

            // Get template materials/spares
            $templateMaterials = $db->table('pm_template_materials ptm')
                ->select('ptm.*, ii.item_name, ii.unit_cost')
                ->join('eam_inventory_items ii', 'ii.id = ptm.item_id')
                ->where('ptm.pm_template_id', $schedule['pm_template_id'])
                ->get()->getResultArray();
            
            // Reserve materials
            $materialService = new \App\Services\WorkOrderMaterialService();
            foreach ($templateMaterials as $material) {
                $materialService->addMaterial($workOrderId, [
                    'inventory_item_id' => $material['item_id'],
                    'quantity_required' => $material['quantity'],
                    'unit_cost' => $material['unit_cost']
                ]);
            }

            // Update PM schedule
            $db->table('pm_schedules')->where('id', $pmScheduleId)->update([
                'status' => 'generated',
                'last_generated_at' => date('Y-m-d H:i:s'),
                'generated_work_order_id' => $workOrderId,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Log PM history
            $db->table('pm_history')->insert([
                'pm_schedule_id' => $pmScheduleId,
                'action' => 'generated',
                'comment' => "Work order {$woCode} generated",
                'performed_by' => $plannerId,
                'performed_at' => date('Y-m-d H:i:s')
            ]);

            // Log work order creation
            $this->logService->logAction($workOrderId, $plannerId, 'created_from_pm', ['pm_schedule_id' => $pmScheduleId]);

            // Send notification
            $this->sendWorkOrderNotification($workOrderId, $plannerId);

            $db->transCommit();

            return [
                'success' => true,
                'work_order_id' => $workOrderId,
                'work_order_number' => $woCode
            ];

        } catch (\Exception $e) {
            $db->transRollback();
            throw $e;
        }
    }

    private function sendWorkOrderNotification(int $workOrderId, int $plannerId): void
    {
        $db = \Config\Database::connect();
        
        // Get planner and supervisor emails
        $users = $db->table('users')
            ->whereIn('role', ['planner', 'supervisor'])
            ->orWhere('id', $plannerId)
            ->get()->getResultArray();

        $workOrder = $this->woModel->find($workOrderId);

        foreach ($users as $user) {
            $db->table('notifications')->insert([
                'user_id' => $user['id'],
                'title' => 'New PM Work Order Generated',
                'message' => "Work order {$workOrder['wo_number']} has been generated from PM schedule",
                'type' => 'work_order',
                'reference_id' => $workOrderId,
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }
}
