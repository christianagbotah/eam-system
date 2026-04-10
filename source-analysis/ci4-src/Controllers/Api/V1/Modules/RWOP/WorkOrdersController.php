<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\EamWorkOrderService;

class WorkOrdersController extends BaseApiController
{
    protected $service;

    public function __construct()
    {
        $this->service = new EamWorkOrderService();
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

    public function assign($id = null)
    {
        $data = $this->request->getJSON(true);
        $result = $this->service->assign($id, $data);
        return $this->respond($result);
    }

    public function complete($id = null)
    {
        $data = $this->request->getJSON(true);
        $result = $this->service->complete($id, $data);
        return $this->respond($result);
    }

    public function delete($id = null)
    {
        $result = $this->service->delete($id);
        return $this->respond($result);
    }

    public function issueMaterials($id)
    {
        $data = $this->request->getJSON(true);
        $result = $this->service->issueMaterials($id, $data);
        return $this->respond($result);
    }

    public function start($id = null)
    {
        $data = $this->request->getJSON(true) ?? [];
        $result = $this->service->start($id, $data);
        return $this->respond($result);
    }

    public function dashboard()
    {
        $result = $this->service->getDashboardStats();
        return $this->respond($result);
    }
}
