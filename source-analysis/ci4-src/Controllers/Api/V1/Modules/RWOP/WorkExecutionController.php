<?php
namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\BaseController;
use App\Services\WorkExecution\WorkExecutionService;

class WorkExecutionController extends BaseController {
    protected $service;

    public function __construct() {
        $this->service = new WorkExecutionService();
    }

    public function index() {
        $executions = $this->service->model->findAll();
        return $this->respond(['success' => true, 'data' => $executions, 'error' => null]);
    }

    public function show($id = null) {
        $execution = $this->service->model->find($id);
        return $this->respond(['success' => true, 'data' => $execution, 'error' => null]);
    }

    public function create() {
        $data = $this->request->getJSON(true);
        $id = $this->service->model->insert($data);
        return $this->respond(['success' => true, 'data' => ['id' => $id], 'error' => null], 201);
    }

    public function update($id = null) {
        $data = $this->request->getJSON(true);
        $this->service->model->update($id, $data);
        return $this->respond(['success' => true, 'data' => null, 'error' => null]);
    }

    public function start() {
        $data = $this->request->getJSON(true);
        $id = $this->service->startExecution($data['work_order_id'], $data['technician_id']);
        return $this->respond(['success' => true, 'data' => ['id' => $id], 'error' => null], 201);
    }

    public function pause($id) {
        $data = $this->request->getJSON(true);
        $this->service->pauseExecution($id, $data['reason'] ?? null);
        return $this->respond(['success' => true, 'data' => null, 'error' => null]);
    }

    public function resume($id) {
        $this->service->resumeExecution($id);
        return $this->respond(['success' => true, 'data' => null, 'error' => null]);
    }

    public function complete($id) {
        $data = $this->request->getJSON(true);
        $this->service->completeExecution($id, $data);
        return $this->respond(['success' => true, 'data' => null, 'error' => null]);
    }
}
