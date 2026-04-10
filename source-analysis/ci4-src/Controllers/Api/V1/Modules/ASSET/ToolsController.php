<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use CodeIgniter\RESTful\ResourceController;
use App\Models\ToolModel;

class ToolsController extends ResourceController
{
    protected $modelName = 'App\Models\ToolModel';
    protected $format = 'json';

    public function index()
    {
        try {
            $plantId = $this->request->getGet('plant_id');
            $availabilityStatus = $this->request->getGet('availability_status');

            if (!$plantId) {
                return $this->failValidationErrors('plant_id is required');
            }

            $model = new ToolModel();
            $builder = $model->where('plant_id', $plantId)->where('is_active', 1);

            if ($availabilityStatus) {
                $builder->where('availability_status', $availabilityStatus);
            }

            $tools = $builder->findAll();

            return $this->respond([
                'status' => 'success',
                'data' => $tools
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function show($id = null)
    {
        try {
            $model = new ToolModel();
            $tool = $model->find($id);

            if (!$tool) {
                return $this->failNotFound('Tool not found');
            }

            return $this->respond([
                'status' => 'success',
                'data' => $tool
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function create()
    {
        try {
            $data = $this->request->getJSON(true);
            $model = new ToolModel();

            if (!$model->insert($data)) {
                return $this->failValidationErrors($model->errors());
            }

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Tool created successfully',
                'id' => $model->getInsertID()
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function update($id = null)
    {
        try {
            $data = $this->request->getJSON(true);
            $model = new ToolModel();

            if (!$model->find($id)) {
                return $this->failNotFound('Tool not found');
            }

            if (!$model->update($id, $data)) {
                return $this->failValidationErrors($model->errors());
            }

            return $this->respond([
                'status' => 'success',
                'message' => 'Tool updated successfully'
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function delete($id = null)
    {
        try {
            $model = new ToolModel();

            if (!$model->find($id)) {
                return $this->failNotFound('Tool not found');
            }

            // Check if tool has active requests
            $requestModel = new \App\Models\WorkOrderToolRequestModel();
            $activeRequests = $requestModel->where('tool_id', $id)
                ->whereIn('request_status', ['PENDING', 'APPROVED', 'ISSUED', 'RETURN_PENDING'])
                ->countAllResults();

            if ($activeRequests > 0) {
                return $this->fail('Cannot delete tool with active requests', 400);
            }

            $model->delete($id);

            return $this->respond([
                'status' => 'success',
                'message' => 'Tool deleted successfully'
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }
}
