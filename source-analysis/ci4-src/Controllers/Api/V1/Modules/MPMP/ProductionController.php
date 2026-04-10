<?php

namespace App\Controllers\Api\V1\Modules\MPMP;

use App\Controllers\Api\V1\BaseApiController;

class ProductionController extends BaseApiController
{
    protected $service;

    public function __construct()
    {
        $this->service = new \App\Services\ProductionService();
    }

    public function index()
    {
        // Permission check
        if (!$this->checkPermission('production', 'view')) {
            return $this->failForbidden('Insufficient permissions to view production data');
        }

        // GET /api/v1/production
        $params = $this->request->getGet();

        // Add plant scoping
        $plantIds = $this->getPlantIds();
        if (!empty($plantIds)) {
            $params['plant_ids'] = $plantIds;
        }

        $result = $this->service->getAll($params);

        // Audit log
        $this->auditLog('VIEW', 'production', 0, null, ['count' => count($result['data'] ?? [])]);

        return $this->respond($result);
    }

    public function show($id = null)
    {
        // Permission check
        if (!$this->checkPermission('production', 'view')) {
            return $this->failForbidden('Insufficient permissions to view production details');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('production', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this production record');
        }

        // GET /api/v1/production/{id}
        $result = $this->service->getById($id);

        // Audit log
        $this->auditLog('VIEW_DETAIL', 'production', $id);

        return $this->respond($result);
    }

    public function create()
    {
        // Permission check
        if (!$this->checkPermission('production', 'create')) {
            return $this->failForbidden('Insufficient permissions to create production records');
        }

        // POST /api/v1/production
        $data = $this->request->getJSON(true);

        // Add plant_id if not provided and user has access to only one plant
        $plantIds = $this->getPlantIds();
        if (count($plantIds) === 1 && !isset($data['plant_id'])) {
            $data['plant_id'] = $plantIds[0];
        }

        $result = $this->service->create($data);

        if ($result['status'] === 'success') {
            // Audit log
            $this->auditLog('CREATE', 'production', $result['data']['id'] ?? null, null, $data);
        }

        return $this->respond($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function update($id = null)
    {
        // Permission check
        if (!$this->checkPermission('production', 'update')) {
            return $this->failForbidden('Insufficient permissions to update production records');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('production', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this production record');
        }

        // PUT /api/v1/production/{id}
        $data = $this->request->getJSON(true);
        $result = $this->service->update($id, $data);

        if ($result['status'] === 'success') {
            // Audit log
            $this->auditLog('UPDATE', 'production', $id, null, $data);
        }

        return $this->respond($result);
    }

    public function delete($id = null)
    {
        // Permission check
        if (!$this->checkPermission('production', 'delete')) {
            return $this->failForbidden('Insufficient permissions to delete production records');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('production', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this production record');
        }

        // DELETE /api/v1/production/{id}
        $result = $this->service->delete($id);

        if ($result['status'] === 'success') {
            // Audit log
            $this->auditLog('DELETE', 'production', $id, null, null);
        }

        return $this->respond($result);
    }
}
