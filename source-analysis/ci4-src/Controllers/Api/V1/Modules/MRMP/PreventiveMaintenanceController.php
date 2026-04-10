<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\PreventiveMaintenanceService;

class PreventiveMaintenanceController extends BaseApiController
{
    protected $service;

    public function __construct()
    {
        $this->service = new PreventiveMaintenanceService();
    }

    public function index()
    {
        $params = $this->getPaginationParams();
        $result = $this->service->getSchedules($params);
        return $this->paginatedResponse($result['data'], $params['page'], $params['per_page'], $result['total']);
    }

    public function show(\$id = null)
    {
        $schedule = $this->service->getScheduleById($id);
        return $schedule ? $this->successResponse($schedule) : $this->notFoundResponse();
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        $result = $this->service->createSchedule($data);
        return $result['success'] ? $this->createdResponse($result['data']) : $this->errorResponse($result['message']);
    }

    public function update(\$id = null)
    {
        $data = $this->request->getJSON(true);
        $result = $this->service->updateSchedule($id, $data);
        return $result['success'] ? $this->successResponse($result['data']) : $this->errorResponse($result['message']);
    }

    public function delete(\$id = null)
    {
        $result = $this->service->deleteSchedule($id);
        return $result['success'] ? $this->noContentResponse() : $this->errorResponse($result['message']);
    }

    public function getTasks()
    {
        $params = $this->getPaginationParams();
        $result = $this->service->getTasks($params);
        return $this->paginatedResponse($result['data'], $params['page'], $params['per_page'], $result['total']);
    }

    public function generateWorkOrders()
    {
        $result = $this->service->generateWorkOrders();
        return $this->successResponse($result['data'], $result['message']);
    }
}
