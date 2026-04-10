<?php

namespace App\Services;

class NotificationService
{
    protected $db;
    protected $notificationModel;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->notificationModel = model('NotificationModel');
    }

    public function sendPermitApprovalNotification($permitId, $approverIds)
    {
        foreach ($approverIds as $approverId) {
            $this->notificationModel->insert([
                'user_id' => $approverId,
                'type' => 'permit_approval',
                'title' => 'Permit Approval Required',
                'message' => "Permit #{$permitId} requires your approval",
                'reference_type' => 'permit',
                'reference_id' => $permitId,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }

    public function sendLOTOVerificationNotification($lotoId, $verifierId)
    {
        $this->notificationModel->insert([
            'user_id' => $verifierId,
            'type' => 'loto_verification',
            'title' => 'LOTO Verification Required',
            'message' => "LOTO application #{$lotoId} requires verification",
            'reference_type' => 'loto',
            'reference_id' => $lotoId,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }

    public function sendWorkOrderCompletionNotification($workOrderId, $supervisorId)
    {
        $this->notificationModel->insert([
            'user_id' => $supervisorId,
            'type' => 'work_order_completion',
            'title' => 'Work Order Completed',
            'message' => "Work Order #{$workOrderId} has been completed and requires approval",
            'reference_type' => 'work_order',
            'reference_id' => $workOrderId,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
}
