<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\EamAssemblyService;

class AssembliesController extends BaseApiController
{
    protected $service;

    public function __construct()
    {
        $this->service = new EamAssemblyService();
    }

    public function index()
    {
        $params = $this->request->getGet();
        $result = $this->service->getAll($params);
        return $this->respond($result);
    }

    public function show($id = null)
    {
        $result = $this->service->getById($id);
        return $this->respond($result);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        $result = $this->service->create($data);
        return $this->respond($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        $result = $this->service->update($id, $data);
        return $this->respond($result);
    }

    public function delete($id = null)
    {
        $result = $this->service->delete($id);
        return $this->respond($result);
    }

    public function parts($assemblyId)
    {
        try {
            $partModel = new \App\Models\PartModel();
            $parts = $partModel->where('component_id', $assemblyId)->findAll();
            return $this->respond([
                'success' => true,
                'data' => $parts
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch parts: ' . $e->getMessage());
        }
    }
}

