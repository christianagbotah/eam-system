<?php

namespace App\Controllers\Api\V1\Modules\IMS;

use App\Controllers\Api\V1\BaseApiController;

class StockTransactionsController extends BaseApiController
{
    protected $service;

    public function __construct()
    {
        $this->service = new \App\Services\StockTransactionsService();
    }

    public function index()
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'view')) {
            return $this->failForbidden('Insufficient permissions to view stock transactions');
        }

        // GET /api/v1/stock-transactions
        $params = $this->request->getGet();

        // Add plant scoping
        $plantIds = $this->getPlantIds();
        if (!empty($plantIds)) {
            $params['plant_ids'] = $plantIds;
        }

        $result = $this->service->getAll($params);

        // Audit log
        $this->auditLog('VIEW', 'stock_transactions', 0, null, ['count' => count($result['data'] ?? [])]);

        return $this->respond($result);
    }

    public function show($id = null)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'view')) {
            return $this->failForbidden('Insufficient permissions to view stock transaction details');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('stock_transactions', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this stock transaction');
        }

        // GET /api/v1/stock-transactions/{id}
        $result = $this->service->getById($id);

        // Audit log
        $this->auditLog('VIEW_DETAIL', 'stock_transactions', $id);

        return $this->respond($result);
    }

    public function create()
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'create')) {
            return $this->failForbidden('Insufficient permissions to create stock transactions');
        }

        // POST /api/v1/stock-transactions
        $data = $this->request->getJSON(true);

        // Add plant_id if not provided and user has access to only one plant
        $plantIds = $this->getPlantIds();
        if (count($plantIds) === 1 && !isset($data['plant_id'])) {
            $data['plant_id'] = $plantIds[0];
        }

        $result = $this->service->create($data);

        if ($result['status'] === 'success') {
            // Audit log
            $this->auditLog('CREATE', 'stock_transactions', $result['data']['id'] ?? null, null, $data);
        }

        return $this->respond($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function update($id = null)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'update')) {
            return $this->failForbidden('Insufficient permissions to update stock transactions');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('stock_transactions', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this stock transaction');
        }

        // PUT /api/v1/stock-transactions/{id}
        $data = $this->request->getJSON(true);
        $result = $this->service->update($id, $data);

        if ($result['status'] === 'success') {
            // Audit log
            $this->auditLog('UPDATE', 'stock_transactions', $id, null, $data);
        }

        return $this->respond($result);
    }

    public function delete($id = null)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'delete')) {
            return $this->failForbidden('Insufficient permissions to delete stock transactions');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('stock_transactions', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this stock transaction');
        }

        // DELETE /api/v1/stock-transactions/{id}
        $result = $this->service->delete($id);

        if ($result['status'] === 'success') {
            // Audit log
            $this->auditLog('DELETE', 'stock_transactions', $id, null, null);
        }

        return $this->respond($result);
    }
}
