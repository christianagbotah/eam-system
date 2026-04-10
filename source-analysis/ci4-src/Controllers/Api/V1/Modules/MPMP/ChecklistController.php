<?php
namespace App\Controllers\Api\V1\Modules\MPMP;

use App\Controllers\BaseController;
use App\Services\Checklists\ChecklistService;

class ChecklistController extends BaseController {
    protected $service;

    public function __construct() {
        $this->service = new ChecklistService();
    }

    public function templates() {
        $templates = $this->service->templateModel->where('is_active', true)->findAll();
        return $this->respond(['success' => true, 'data' => $templates, 'error' => null]);
    }

    public function createTemplate() {
        $data = $this->request->getJSON(true);
        $id = $this->service->createTemplate($data);
        return $this->respond(['success' => true, 'data' => ['id' => $id], 'error' => null], 201);
    }

    public function index() {
        $checklists = $this->service->model->findAll();
        return $this->respond(['success' => true, 'data' => $checklists, 'error' => null]);
    }

    public function create() {
        $data = $this->request->getJSON(true);
        $id = $this->service->createEntry($data);
        return $this->respond(['success' => true, 'data' => ['id' => $id], 'error' => null], 201);
    }

    public function show($id = null) {
        $checklist = $this->service->model->find($id);
        return $this->respond(['success' => true, 'data' => $checklist, 'error' => null]);
    }
}
