<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseApiController;

class WorkOrderTasksController extends BaseApiController
{
    protected $service;

    public function __construct()
    {
        $this->service = new \App\Services\WorkOrderTasksService();
    }

    public function index()
    {
        // GET /api/v1/work-order-tasks
        $result = $this->service->getAll($this->request->getGet());
        return $this->respond($result);
    }

    public function show($id = null)
    {
        // GET /api/v1/work-order-tasks/{id}
        $result = $this->service->getById($id);
        return $this->respond($result);
    }

    public function create()
    {
        // POST /api/v1/work-order-tasks
        $data = $this->request->getJSON(true);
        $result = $this->service->create($data);
        return $this->respond($result, $result['status'] === 200 ? 201 : 400);
    }

    public function update($id = null)
    {
        // PUT /api/v1/work-order-tasks/{id}
        $data = $this->request->getJSON(true);
        $result = $this->service->update($id, $data);
        return $this->respond($result);
    }

    public function delete($id = null)
    {
        // DELETE /api/v1/work-order-tasks/{id}
        $result = $this->service->delete($id);
        return $this->respond($result);
    }
}
