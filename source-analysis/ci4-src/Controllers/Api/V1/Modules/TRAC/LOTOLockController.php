<?php

namespace App\Controllers\Api\V1\Modules\TRAC;

use App\Models\LOTOModels;
use App\Controllers\Api\V1\BaseResourceController;

class LOTOLockController extends BaseResourceController
{
    protected $modelName = 'App\Models\LOTOLockModel';
    protected $format = 'json';

    public function index()
    {
        $status = $this->request->getGet('status');
        $assignedTo = $this->request->getGet('assigned_to');
        
        $builder = $this->model->builder();
        
        if ($status) {
            $builder->where('status', $status);
        }
        
        if ($assignedTo) {
            $builder->where('assigned_to', $assignedTo);
        }
        
        $locks = $builder->get()->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $locks
        ]);
    }

    public function show($id = null)
    {
        $lock = $this->model->find($id);
        
        if (!$lock) {
            return $this->failNotFound('Lock not found');
        }
        
        return $this->respond([
            'status' => 'success',
            'data' => $lock
        ]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        
        if ($this->model->insert($data)) {
            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Lock created successfully',
                'data' => ['id' => $this->model->getInsertID()]
            ]);
        }
        
        return $this->fail($this->model->errors());
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        
        if (!$this->model->find($id)) {
            return $this->failNotFound('Lock not found');
        }
        
        if ($this->model->update($id, $data)) {
            return $this->respond([
                'status' => 'success',
                'message' => 'Lock updated successfully'
            ]);
        }
        
        return $this->fail($this->model->errors());
    }

    public function delete($id = null)
    {
        if (!$this->model->find($id)) {
            return $this->failNotFound('Lock not found');
        }
        
        if ($this->model->delete($id)) {
            return $this->respondDeleted([
                'status' => 'success',
                'message' => 'Lock deleted successfully'
            ]);
        }
        
        return $this->fail('Failed to delete lock');
    }
}
