<?php

namespace App\Services;

use App\Repositories\EamInventoryRepository;

class EamInventoryService
{
    protected $repo;

    public function __construct()
    {
        $this->repo = new EamInventoryRepository();
    }

    public function getAll($params)
    {
        return $this->repo->paginate($params['page'] ?? 1, $params['limit'] ?? 20, $params['search'] ?? '');
    }

    public function getById($id)
    {
        $data = $this->repo->find($id);
        return $data ? ['status' => 'success', 'data' => $data] : ['status' => 'error', 'message' => 'Not found'];
    }

    public function create($data)
    {
        $id = $this->repo->create($data);
        return $id ? ['status' => 'success', 'data' => ['id' => $id]] : ['status' => 'error', 'message' => 'Creation failed'];
    }

    public function update($id, $data)
    {
        $result = $this->repo->update($id, $data);
        return $result ? ['status' => 'success', 'message' => 'Updated'] : ['status' => 'error', 'message' => 'Update failed'];
    }

    public function delete($id)
    {
        $result = $this->repo->delete($id);
        return $result ? ['status' => 'success', 'message' => 'Deleted'] : ['status' => 'error', 'message' => 'Delete failed'];
    }

    public function stockIn($data)
    {
        $result = $this->repo->stockIn($data['item_id'], $data['quantity'], $data['reference'] ?? null);
        return $result ? ['status' => 'success', 'message' => 'Stock added'] : ['status' => 'error', 'message' => 'Stock in failed'];
    }

    public function stockOut($data)
    {
        $result = $this->repo->stockOut($data['item_id'], $data['quantity'], $data['reference'] ?? null);
        return $result ? ['status' => 'success', 'message' => 'Stock removed'] : ['status' => 'error', 'message' => 'Stock out failed'];
    }

    public function reserveForWorkOrder($data)
    {
        $result = $this->repo->reserve($data['item_id'], $data['work_order_id'], $data['quantity']);
        return $result ? ['status' => 'success', 'message' => 'Reserved'] : ['status' => 'error', 'message' => 'Reservation failed'];
    }

    public function consumeItem($data)
    {
        $result = $this->repo->stockOut($data['inventory_item_id'], $data['quantity'], $data['work_order_id'] ?? null);
        return $result ? ['status' => 'success', 'message' => 'Item consumed'] : ['status' => 'error', 'message' => 'Consumption failed'];
    }

    public function getLowStockItems()
    {
        $items = $this->repo->getLowStock();
        return ['status' => 'success', 'data' => $items];
    }

    public function getDashboardStats()
    {
        return [
            'status' => 'success',
            'data' => [
                'total_items' => $this->repo->countAll(),
                'low_stock' => $this->repo->countLowStock(),
                'total_value' => $this->repo->getTotalValue(),
            ]
        ];
    }
}
