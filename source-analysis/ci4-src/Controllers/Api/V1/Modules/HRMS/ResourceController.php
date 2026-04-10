<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseResourceController;
use App\Models\ResourceAvailabilityModel;

class ResourceAvailabilityController extends BaseResourceController
{
    protected $modelName = 'App\Models\ResourceAvailabilityModel';
    protected $format = 'json';

    public function index()
    {
        $model = new ResourceAvailabilityModel();
        $resources = $model->orderBy('available_from', 'ASC')->findAll();
        return $this->respond(['status' => 'success', 'data' => $resources]);
    }

    public function show($id = null)
    {
        $model = new ResourceAvailabilityModel();
        $resource = $model->find($id);
        if (!$resource) return $this->failNotFound('Resource not found');
        return $this->respond(['status' => 'success', 'data' => $resource]);
    }

    public function create()
    {
        $model = new ResourceAvailabilityModel();
        $data = $this->request->getJSON(true);
        if ($model->insert($data)) {
            return $this->respondCreated(['status' => 'success', 'message' => 'Resource created', 'id' => $model->getInsertID()]);
        }
        return $this->fail($model->errors());
    }

    public function update($id = null)
    {
        $model = new ResourceAvailabilityModel();
        $data = $this->request->getJSON(true);
        if ($model->update($id, $data)) {
            return $this->respond(['status' => 'success', 'message' => 'Resource updated']);
        }
        return $this->fail($model->errors());
    }

    public function delete($id = null)
    {
        $model = new ResourceAvailabilityModel();
        if ($model->delete($id)) {
            return $this->respondDeleted(['status' => 'success', 'message' => 'Resource deleted']);
        }
        return $this->fail('Failed to delete resource');
    }

    public function available()
    {
        $model = new ResourceAvailabilityModel();
        $available = $model->where('status', 'available')
            ->where('available_from <=', date('Y-m-d H:i:s'))
            ->where('available_to >=', date('Y-m-d H:i:s'))
            ->findAll();
        return $this->respond(['status' => 'success', 'data' => $available]);
    }

    public function utilization()
    {
        $model = new ResourceAvailabilityModel();
        $resources = $model->findAll();
        $utilization = array_map(function($resource) {
            $util = ($resource['allocated'] / $resource['capacity']) * 100;
            return [
                'resource_name' => $resource['resource_name'],
                'type' => $resource['resource_type'],
                'utilization' => round($util, 2),
                'status' => $resource['status']
            ];
        }, $resources);
        return $this->respond(['status' => 'success', 'data' => $utilization]);
    }
}
