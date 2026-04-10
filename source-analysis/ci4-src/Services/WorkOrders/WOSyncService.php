<?php

namespace App\Services\WorkOrders;

class WOSyncService
{
    protected $syncModel;
    protected $woService;

    public function __construct()
    {
        $this->syncModel = model('App\Models\MobileSyncBatchModel');
        $this->woService = new WorkOrderService();
    }

    public function applyMobileBatch($payload)
    {
        $batchId = $payload['batch_id'];
        
        $existing = $this->syncModel->where('batch_id', $batchId)->first();
        if ($existing) {
            return ['status' => 'success', 'mapping' => json_decode($existing['result_mapping'], true)];
        }

        $this->syncModel->insert([
            'batch_id' => $batchId,
            'user_id' => $payload['user_id'],
            'operations' => json_encode($payload['operations']),
            'status' => 'processing'
        ]);

        $mapping = [];
        
        foreach ($payload['operations'] as $op) {
            try {
                if ($op['type'] === 'start') {
                    $this->woService->start($op['work_order_id'], $payload['user_id']);
                    $mapping[$op['client_id']] = ['server_id' => $op['work_order_id'], 'status' => 'success'];
                } elseif ($op['type'] === 'complete') {
                    $this->woService->complete($op['work_order_id'], $payload['user_id'], $op['data']);
                    $mapping[$op['client_id']] = ['server_id' => $op['work_order_id'], 'status' => 'success'];
                }
            } catch (\Exception $e) {
                $mapping[$op['client_id']] = ['status' => 'error', 'message' => $e->getMessage()];
            }
        }

        $this->syncModel->where('batch_id', $batchId)->set([
            'status' => 'completed',
            'result_mapping' => json_encode($mapping),
            'processed_at' => date('Y-m-d H:i:s')
        ])->update();

        return ['status' => 'success', 'mapping' => $mapping];
    }
}
