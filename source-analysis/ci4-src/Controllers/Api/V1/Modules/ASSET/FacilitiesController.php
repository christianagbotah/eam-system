<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseApiController;

class FacilitiesController extends BaseApiController
{
    protected $modelName = 'App\Models\FacilitiesModel';

    public function index()
    {
        if ($error = $this->requirePermission('facilities.view')) return $error;
        return $this->respondSuccess($this->model->findAll());
    }

    public function show($id = null)
    {
        if ($error = $this->requirePermission('facilities.view')) return $error;
        $data = $this->model->find($id);
        if (!$data) return $this->respondError('Facility not found', null, 404);
        return $this->respondSuccess($data);
    }

    public function create()
    {
        if ($error = $this->requirePermission('facilities.create')) return $error;
        
        $data = $this->validatePlantInRequest($this->request->getJSON(true));
        if ($data instanceof \CodeIgniter\HTTP\ResponseInterface) return $data;
        
        $id = $this->model->insert($data);
        if ($id) {
            $this->auditLog('create', 'facility', $id, $data);
            return $this->respondSuccess(['id' => $id], 'Facility created successfully');
        }
        return $this->respondError('Failed to create facility', $this->model->errors());
    }

    public function update($id = null)
    {
        if ($error = $this->requirePermission('facilities.update')) return $error;
        
        $data = $this->request->getJSON(true);
        unset($data['plant_id']);
        
        if ($this->model->update($id, $data)) {
            $this->auditLog('update', 'facility', $id, $data);
            return $this->respondSuccess(null, 'Facility updated successfully');
        }
        return $this->respondError('Failed to update facility', $this->model->errors());
    }

    public function delete($id = null)
    {
        if ($error = $this->requirePermission('facilities.delete')) return $error;
        
        if ($this->model->delete($id)) {
            $this->auditLog('delete', 'facility', $id);
            return $this->respondSuccess(null, 'Facility deleted successfully');
        }
        return $this->respondError('Failed to delete facility', null, 404);
    }
}
