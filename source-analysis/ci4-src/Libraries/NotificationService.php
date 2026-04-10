<?php

namespace App\Libraries;

class NotificationService
{
    protected $notificationModel;
    protected $userModel;

    public function __construct()
    {
        $this->notificationModel = new \App\Models\NotificationModel();
        $this->userModel = new \App\Models\UserModel();
    }

    public function notifyRequestCreated($requestId, $requestData)
    {
        $managers = $this->userModel->where('role', 'manager')->findAll();
        
        foreach ($managers as $manager) {
            $this->send([
                'user_id' => $manager['id'],
                'type' => 'request_created',
                'title' => 'New Maintenance Request',
                'message' => "New maintenance request #{$requestId} created for {$requestData['asset_name']}",
                'entity_type' => 'maintenance_request',
                'entity_id' => $requestId,
                'priority' => $requestData['priority'],
                'send_email' => true,
                'send_sms' => $requestData['priority'] === 'high'
            ]);
        }
    }

    public function notifyRequestApproved($requestId, $requestData, $approverId)
    {
        $this->send([
            'user_id' => $requestData['requested_by'],
            'type' => 'request_approved',
            'title' => 'Request Approved',
            'message' => "Your maintenance request #{$requestId} has been approved",
            'entity_type' => 'maintenance_request',
            'entity_id' => $requestId,
            'priority' => 'normal',
            'send_email' => true
        ]);
    }

    public function notifyWorkOrderCreated($workOrderId, $workOrderData)
    {
        $supervisors = $this->userModel->where('role', 'supervisor')->findAll();
        
        foreach ($supervisors as $supervisor) {
            $this->send([
                'user_id' => $supervisor['id'],
                'type' => 'work_order_created',
                'title' => 'New Work Order',
                'message' => "Work order #{$workOrderId} created - {$workOrderData['description']}",
                'entity_type' => 'work_order',
                'entity_id' => $workOrderId,
                'priority' => $workOrderData['priority'],
                'send_email' => true
            ]);
        }
    }

    public function notifyWorkOrderAssigned($workOrderId, $workOrderData, $technicianId)
    {
        $this->send([
            'user_id' => $technicianId,
            'type' => 'work_order_assigned',
            'title' => 'Work Order Assigned',
            'message' => "Work order #{$workOrderId} has been assigned to you - {$workOrderData['description']}",
            'entity_type' => 'work_order',
            'entity_id' => $workOrderId,
            'priority' => $workOrderData['priority'],
            'send_email' => true,
            'send_sms' => $workOrderData['priority'] === 'high'
        ]);
    }

    public function notifyWorkOrderAcknowledged($workOrderId, $workOrderData)
    {
        $this->notifyManagers([
            'type' => 'work_order_acknowledged',
            'title' => 'Work Order Acknowledged',
            'message' => "Work order #{$workOrderId} acknowledged by technician",
            'entity_type' => 'work_order',
            'entity_id' => $workOrderId,
            'priority' => 'normal',
            'send_email' => false
        ]);
    }

    public function notifyWorkOrderStarted($workOrderId, $workOrderData)
    {
        $this->notifyManagers([
            'type' => 'work_order_started',
            'title' => 'Work Started',
            'message' => "Work order #{$workOrderId} work has started",
            'entity_type' => 'work_order',
            'entity_id' => $workOrderId,
            'priority' => 'normal',
            'send_email' => false
        ]);
    }

    public function notifyWorkOrderCompleted($workOrderId, $workOrderData)
    {
        $this->notifyManagers([
            'type' => 'work_order_completed',
            'title' => 'Work Completed',
            'message' => "Work order #{$workOrderId} has been completed and ready for inspection",
            'entity_type' => 'work_order',
            'entity_id' => $workOrderId,
            'priority' => 'normal',
            'send_email' => true
        ]);
    }

    public function notifyWorkOrderClosed($workOrderId, $workOrderData)
    {
        $this->send([
            'user_id' => $workOrderData['assigned_to'],
            'type' => 'work_order_closed',
            'title' => 'Work Order Closed',
            'message' => "Work order #{$workOrderId} has been closed",
            'entity_type' => 'work_order',
            'entity_id' => $workOrderId,
            'priority' => 'normal',
            'send_email' => true
        ]);
    }

    private function notifyManagers($data)
    {
        $managers = $this->userModel->where('role', 'manager')->findAll();
        foreach ($managers as $manager) {
            $data['user_id'] = $manager['id'];
            $this->send($data);
        }
    }

    private function send($data)
    {
        try {
            $this->notificationModel->insert([
                'user_id' => $data['user_id'],
                'type' => $data['type'],
                'title' => $data['title'],
                'message' => $data['message'],
                'entity_type' => $data['entity_type'] ?? null,
                'entity_id' => $data['entity_id'] ?? null,
                'priority' => $data['priority'] ?? 'normal',
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Notification send failed: ' . $e->getMessage());
        }
    }
}
