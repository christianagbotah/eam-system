<?php

namespace App\Controllers\Api\V1\Modules\IMS;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\EamPartService;

class PartsController extends BaseApiController
{
    protected $service;

    public function __construct()
    {
        $this->service = new EamPartService();
    }

    public function index()
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'view')) {
            return $this->failForbidden('Insufficient permissions to view parts');
        }

        try {
            $params = $this->request->getGet();

            // Add plant scoping if parts have plant_id
            $plantIds = $this->getPlantIds();
            if (!empty($plantIds)) {
                $params['plant_ids'] = $plantIds;
            }

            $result = $this->service->getAll($params);

            // Audit log
            $this->auditLog('VIEW', 'parts', 0, null, ['count' => count($result['data'] ?? [])]);

            return $this->respond($result);
        } catch (\Exception $e) {
            log_message('error', 'Parts index error: ' . $e->getMessage());
            return $this->respond(['status' => 'error', 'message' => 'Failed to load parts'], 500);
        }
    }

    public function show($id = null)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'view')) {
            return $this->failForbidden('Insufficient permissions to view part details');
        }

        // Validate resource ownership if parts have plant_id
        if (!$this->validateResourceOwnership('parts', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this part');
        }

        $result = $this->service->getById($id);

        // Audit log
        $this->auditLog('VIEW_DETAIL', 'parts', $id);

        return $this->respond($result);
    }

    public function create()
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'create')) {
            return $this->failForbidden('Insufficient permissions to create parts');
        }

        $data = $this->request->getJSON(true);

        // Add plant_id to data if not provided and user has access to only one plant
        $plantIds = $this->getPlantIds();
        if (count($plantIds) === 1 && !isset($data['plant_id'])) {
            $data['plant_id'] = $plantIds[0];
        }

        $result = $this->service->create($data);

        if ($result['status'] === 'success') {
            // Audit log
            $this->auditLog('CREATE', 'parts', $result['data']['id'] ?? null, null, $data);
        }

        return $this->respond($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function update($id = null)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'update')) {
            return $this->failForbidden('Insufficient permissions to update parts');
        }

        // Validate resource ownership if parts have plant_id
        if (!$this->validateResourceOwnership('parts', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this part');
        }

        $data = $this->request->getJSON(true);
        $result = $this->service->update($id, $data);

        if ($result['status'] === 'success') {
            // Audit log
            $this->auditLog('UPDATE', 'parts', $id, null, $data);
        }

        return $this->respond($result);
    }

    public function delete($id = null)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'delete')) {
            return $this->failForbidden('Insufficient permissions to delete parts');
        }

        // Validate resource ownership if parts have plant_id
        if (!$this->validateResourceOwnership('parts', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this part');
        }

        $result = $this->service->delete($id);

        if ($result['status'] === 'success') {
            // Audit log
            $this->auditLog('DELETE', 'parts', $id, null, null);
        }

        return $this->respond($result);
    }
}

