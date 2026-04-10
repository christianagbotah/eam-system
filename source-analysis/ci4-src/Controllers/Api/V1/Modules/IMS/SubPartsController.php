<?php

namespace App\Controllers\Api\V1\Modules\IMS;

use App\Controllers\Api\V1\BaseApiController;

class SubPartsController extends BaseApiController
{
    protected $modelName = 'App\Models\SubPartModel';
    protected $format = 'json';

    public function index()
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'view')) {
            return $this->failForbidden('Insufficient permissions to view sub-parts');
        }

        $partId = $this->request->getGet('part_id');
        $builder = $this->model->builder();
        if ($partId) $builder->where('part_id', $partId);

        $data = $builder->get()->getResultArray();

        // Audit log
        $this->auditLog('VIEW', 'sub_parts', 0, null, ['count' => count($data)]);

        return $this->respond([
            'status' => 'success',
            'data' => $data,
            'message' => 'Sub-parts retrieved successfully'
        ]);
    }

    public function show($id = null)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'view')) {
            return $this->failForbidden('Insufficient permissions to view sub-part details');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('sub_parts', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this sub-part');
        }

        $data = $this->model->find($id);
        if (!$data) {
            return $this->failNotFound('Sub-part not found');
        }

        // Audit log
        $this->auditLog('VIEW_DETAIL', 'sub_parts', $id);

        return $this->respond([
            'status' => 'success',
            'data' => $data,
            'message' => 'Sub-part retrieved successfully'
        ]);
    }

    public function create()
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'create')) {
            return $this->failForbidden('Insufficient permissions to create sub-parts');
        }

        $data = $this->request->getJSON(true);

        // Add plant_id if not provided and user has access to only one plant
        $plantIds = $this->getPlantIds();
        if (count($plantIds) === 1 && !isset($data['plant_id'])) {
            $data['plant_id'] = $plantIds[0];
        }

        if ($this->model->insert($data)) {
            $newId = $this->model->getInsertID();

            // Audit log
            $this->auditLog('CREATE', 'sub_parts', $newId, null, $data);

            return $this->respondCreated([
                'status' => 'success',
                'data' => ['id' => $newId],
                'message' => 'Sub-part created successfully'
            ]);
        }
        return $this->fail($this->model->errors());
    }

    public function update($id = null)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'update')) {
            return $this->failForbidden('Insufficient permissions to update sub-parts');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('sub_parts', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this sub-part');
        }

        $data = $this->request->getJSON(true);
        if ($this->model->update($id, $data)) {
            // Audit log
            $this->auditLog('UPDATE', 'sub_parts', $id, null, $data);

            return $this->respond([
                'status' => 'success',
                'message' => 'Sub-part updated successfully'
            ]);
        }
        return $this->fail($this->model->errors());
    }

    public function delete($id = null)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'delete')) {
            return $this->failForbidden('Insufficient permissions to delete sub-parts');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('sub_parts', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this sub-part');
        }

        if ($this->model->delete($id)) {
            // Audit log
            $this->auditLog('DELETE', 'sub_parts', $id, null, null);

            return $this->respondDeleted([
                'status' => 'success',
                'message' => 'Sub-part deleted successfully'
            ]);
        }
        return $this->failNotFound('Sub-part not found');
    }
}
