<?php
namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\BaseController;
use App\Services\Shift\ShiftHandoverService;

class ShiftHandoverController extends BaseController {
    protected $service;

    public function __construct() {
        $this->service = new ShiftHandoverService();
    }

    public function index() {
        $handovers = $this->service->model->findAll();
        return $this->respond(['success' => true, 'data' => $handovers, 'error' => null]);
    }

    public function create() {
        $data = $this->request->getJSON(true);
        $id = $this->service->createHandover($data);
        return $this->respond(['success' => true, 'data' => ['id' => $id], 'error' => null], 201);
    }

    public function show($id = null) {
        $handover = $this->service->model->find($id);
        return $this->respond(['success' => true, 'data' => $handover, 'error' => null]);
    }

    public function accept($id) {
        $data = $this->request->getJSON(true);
        $this->service->acceptHandover($id, $data['user_id']);
        return $this->respond(['success' => true, 'data' => null, 'error' => null]);
    }

    public function reject($id) {
        $data = $this->request->getJSON(true);
        $this->service->rejectHandover($id, $data['reason']);
        return $this->respond(['success' => true, 'data' => null, 'error' => null]);
    }

    public function pending() {
        $machineId = $this->request->getGet('machine_id');
        $handovers = $this->service->listPending($machineId);
        return $this->respond(['success' => true, 'data' => $handovers, 'error' => null]);
    }
}
