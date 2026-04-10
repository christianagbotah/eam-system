<?php

namespace App\Services\WorkOrders;

class WOChecklistService
{
    protected $checklistModel;

    public function __construct()
    {
        $this->checklistModel = model('App\Models\WorkOrderChecklistItemModel');
    }

    public function attachChecklistFromTemplate($templateId, $workOrderId)
    {
        $templateModel = model('App\Models\PmChecklistItemModel');
        $items = $templateModel->where('pm_checklist_id', $templateId)->findAll();

        foreach ($items as $item) {
            $this->checklistModel->insert([
                'work_order_id' => $workOrderId,
                'item_order' => $item['item_order'],
                'item_type' => $item['item_type'],
                'description' => $item['description'],
                'is_completed' => 0
            ]);
        }
    }

    public function validateChecklistCompletion($workOrderId)
    {
        $total = $this->checklistModel->where('work_order_id', $workOrderId)->countAllResults();
        $completed = $this->checklistModel->where('work_order_id', $workOrderId)
            ->where('is_completed', 1)->countAllResults();

        return $total > 0 && $total === $completed;
    }

    public function updateItem($itemId, $userId, $responseValue)
    {
        return $this->checklistModel->update($itemId, [
            'response_value' => $responseValue,
            'is_completed' => 1,
            'completed_by' => $userId,
            'completed_at' => date('Y-m-d H:i:s')
        ]);
    }
}
