<?php

namespace App\Controllers\Api\V1\Modules\IMS;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\EamInventoryService;

class EamInventoryController extends BaseApiController
{
    protected $service;

    public function __construct()
    {
        parent::__construct();
        $this->service = new EamInventoryService();
    }

    public function index()
    {
        if ($error = $this->requirePermission('inventory.view')) return $error;
        $result = $this->service->getAll($this->request->getGet());
        return $this->respond($result);
    }

    public function show($id = null)
    {
        if ($error = $this->requirePermission('inventory.view')) return $error;
        $result = $this->service->getById($id);
        return $this->respond($result);
    }

    public function create()
    {
        if ($error = $this->requirePermission('inventory.create')) return $error;
        $data = $this->validatePlantInRequest($this->request->getJSON(true));
        if ($data instanceof \CodeIgniter\HTTP\ResponseInterface) return $data;
        $result = $this->service->create($data);
        if ($result['status'] === 'success') {
            $this->auditLog('create', 'inventory', $result['data']['id'] ?? null, $data);
        }
        return $this->respond($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function update($id = null)
    {
        if ($error = $this->requirePermission('inventory.update')) return $error;
        $data = $this->request->getJSON(true);
        unset($data['plant_id']);
        $result = $this->service->update($id, $data);
        if ($result['status'] === 'success') {
            $this->auditLog('update', 'inventory', $id, $data);
        }
        return $this->respond($result);
    }

    public function delete($id = null)
    {
        if ($error = $this->requirePermission('inventory.delete')) return $error;
        $result = $this->service->delete($id);
        if ($result['status'] === 'success') {
            $this->auditLog('delete', 'inventory', $id);
        }
        return $this->respond($result);
    }

    public function stockIn()
    {
        if ($error = $this->requirePermission('inventory.stock_in')) return $error;
        $data = $this->request->getJSON(true);
        $result = $this->service->stockIn($data);
        if ($result['status'] === 'success') {
            $this->auditLog('stock_in', 'inventory', $data['inventory_item_id'] ?? null, $data);
        }
        return $this->respond($result);
    }

    public function stockOut()
    {
        if ($error = $this->requirePermission('inventory.stock_out')) return $error;
        $data = $this->request->getJSON(true);
        $result = $this->service->stockOut($data);
        if ($result['status'] === 'success') {
            $this->auditLog('stock_out', 'inventory', $data['inventory_item_id'] ?? null, $data);
        }
        return $this->respond($result);
    }

    public function reserve($id = null)
    {
        if ($error = $this->requirePermission('inventory.reserve')) return $error;
        $data = $this->request->getJSON(true);
        if ($id) $data['inventory_item_id'] = $id;
        $result = $this->service->reserveForWorkOrder($data);
        if ($result['status'] === 'success') {
            $this->auditLog('reserve', 'inventory', $id, $data);
        }
        return $this->respond($result);
    }

    public function consume($id = null)
    {
        if ($error = $this->requirePermission('inventory.consume')) return $error;
        $data = $this->request->getJSON(true);
        $data['inventory_item_id'] = $id;
        $result = $this->service->consumeItem($data);
        if ($result['status'] === 'success') {
            $this->auditLog('consume', 'inventory', $id, $data);
        }
        return $this->respond($result);
    }
}

