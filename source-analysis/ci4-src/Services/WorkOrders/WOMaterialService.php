<?php

namespace App\Services\WorkOrders;

use App\Models\WorkOrderMaterial;
use App\Models\InventoryItem;
use App\Models\StockTransaction;

class WOMaterialService
{
    protected $materialModel;
    protected $inventoryModel;
    protected $transactionModel;

    public function __construct()
    {
        $this->materialModel = new WorkOrderMaterial();
        $this->inventoryModel = new InventoryItem();
        $this->transactionModel = new StockTransaction();
    }

    public function addMaterial(int $workOrderId, array $data): array
    {
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            $data['work_order_id'] = $workOrderId;
            $materialId = $this->materialModel->insert($data);

            if (isset($data['inventory_item_id'])) {
                $this->reserveInventory($data['inventory_item_id'], $data['quantity_required']);
            }

            $db->transCommit();
            return $this->materialModel->find($materialId);
        } catch (\Exception $e) {
            $db->transRollback();
            throw $e;
        }
    }

    public function issueMaterial(int $materialId, float $quantity): bool
    {
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            $material = $this->materialModel->find($materialId);
            if (!$material) throw new \Exception('Material not found');

            $this->materialModel->update($materialId, [
                'quantity_issued' => $quantity,
                'status' => 'issued'
            ]);

            $this->transactionModel->insert([
                'inventory_item_id' => $material['inventory_item_id'],
                'transaction_type' => 'issue',
                'quantity' => -$quantity,
                'notes' => "Issued to WO #{$material['work_order_id']}"
            ]);

            $this->updateInventoryQuantity($material['inventory_item_id'], -$quantity);

            $db->transCommit();
            return true;
        } catch (\Exception $e) {
            $db->transRollback();
            throw $e;
        }
    }

    private function reserveInventory(int $itemId, float $quantity): void
    {
        $item = $this->inventoryModel->find($itemId);
        if (!$item) throw new \Exception('Inventory item not found');

        $availableQty = $item['quantity_on_hand'] - $item['quantity_reserved'];
        if ($availableQty < $quantity) {
            throw new \Exception('Insufficient inventory available');
        }

        $this->inventoryModel->update($itemId, [
            'quantity_reserved' => $item['quantity_reserved'] + $quantity
        ]);
    }

    public function reserveMaterial(int $materialId): array
    {
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            $material = $this->materialModel->find($materialId);
            if (!$material) throw new \Exception('Material not found');

            $this->reserveInventory($material['inventory_item_id'], $material['quantity_required']);

            $this->materialModel->update($materialId, [
                'quantity_reserved' => $material['quantity_required'],
                'status' => 'reserved'
            ]);

            $db->transCommit();
            return $this->materialModel->find($materialId);
        } catch (\Exception $e) {
            $db->transRollback();
            throw $e;
        }
    }

    public function releaseMaterial(int $materialId): array
    {
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            $material = $this->materialModel->find($materialId);
            if (!$material) throw new \Exception('Material not found');

            $item = $this->inventoryModel->find($material['inventory_item_id']);
            $this->inventoryModel->update($material['inventory_item_id'], [
                'quantity_reserved' => max(0, $item['quantity_reserved'] - $material['quantity_reserved'])
            ]);

            $this->materialModel->update($materialId, [
                'quantity_reserved' => 0,
                'status' => 'required'
            ]);

            $db->transCommit();
            return $this->materialModel->find($materialId);
        } catch (\Exception $e) {
            $db->transRollback();
            throw $e;
        }
    }

    private function updateInventoryQuantity(int $itemId, float $quantity): void
    {
        $item = $this->inventoryModel->find($itemId);
        $this->inventoryModel->update($itemId, [
            'quantity_on_hand' => $item['quantity_on_hand'] + $quantity,
            'quantity_reserved' => max(0, $item['quantity_reserved'] + $quantity)
        ]);
    }
}
