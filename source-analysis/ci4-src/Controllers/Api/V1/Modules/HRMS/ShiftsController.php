<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseApiController;

class ShiftsController extends BaseApiController
{
    protected $modelName = 'App\Models\ShiftModel';
    protected $format = 'json';

    public function index()
    {
        // Permission check
        if (!$this->checkPermission('user', 'view')) {
            return $this->failForbidden('Insufficient permissions to view shifts');
        }

        $data = $this->model->findAll();

        // Audit log
        $this->auditLog('VIEW', 'shifts', 0, null, ['count' => count($data)]);

        return $this->respond([
            'status' => 'success',
            'data' => $data,
            'message' => 'Shifts retrieved successfully'
        ]);
    }

    public function show($id = null)
    {
        // Permission check
        if (!$this->checkPermission('user', 'view')) {
            return $this->failForbidden('Insufficient permissions to view shift details');
        }

        $data = $this->model->find($id);
        if (!$data) {
            return $this->failNotFound('Shift not found');
        }

        // Audit log
        $this->auditLog('VIEW_DETAIL', 'shifts', $id);

        return $this->respond([
            'status' => 'success',
            'data' => $data,
            'message' => 'Shift retrieved successfully'
        ]);
    }

    public function create()
    {
        // Permission check
        if (!$this->checkPermission('user', 'create')) {
            return $this->failForbidden('Insufficient permissions to create shifts');
        }

        $data = $this->request->getJSON(true);
        
        $validation = \Config\Services::validation();
        $validation->setRules([
            'name' => 'required|min_length[2]|max_length[50]',
            'start_time' => 'required',
            'end_time' => 'required'
        ]);
        
        if (!$validation->run($data)) {
            return $this->fail($validation->getErrors());
        }
        
        if ($this->model->insert($data)) {
            $newId = $this->model->getInsertID();

            // Audit log
            $this->auditLog('CREATE', 'shifts', $newId, null, $data);

            return $this->respondCreated([
                'status' => 'success',
                'data' => ['id' => $newId],
                'message' => 'Shift created successfully'
            ]);
        }
        return $this->fail($this->model->errors());
    }

    public function update($id = null)
    {
        // Permission check
        if (!$this->checkPermission('user', 'update')) {
            return $this->failForbidden('Insufficient permissions to update shifts');
        }

        $data = $this->request->getJSON(true);
        if ($this->model->update($id, $data)) {
            // Audit log
            $this->auditLog('UPDATE', 'shifts', $id, null, $data);

            return $this->respond([
                'status' => 'success',
                'message' => 'Shift updated successfully'
            ]);
        }
        return $this->fail($this->model->errors());
    }

    public function delete($id = null)
    {
        // Permission check
        if (!$this->checkPermission('user', 'delete')) {
            return $this->failForbidden('Insufficient permissions to delete shifts');
        }

        if ($this->model->delete($id)) {
            // Audit log
            $this->auditLog('DELETE', 'shifts', $id, null, null);

            return $this->respondDeleted([
                'status' => 'success',
                'message' => 'Shift deleted successfully'
            ]);
        }
        return $this->failNotFound('Shift not found');
    }
}
