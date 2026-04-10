<?php

namespace App\Services\WorkOrders;

class WOLogService
{
    protected $logModel;

    public function __construct()
    {
        $this->logModel = model('App\Models\WorkOrderLogModel');
    }

    public function logAction($workOrderId, $userId, $action, $details)
    {
        return $this->logModel->insert([
            'work_order_id' => $workOrderId,
            'user_id' => $userId,
            'action' => $action,
            'details' => json_encode($details),
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }

    public function getHistory($workOrderId)
    {
        return $this->logModel->select('work_order_logs.*, users.username')
            ->join('users', 'users.id = work_order_logs.user_id')
            ->where('work_order_id', $workOrderId)
            ->orderBy('created_at', 'DESC')
            ->findAll();
    }
}
