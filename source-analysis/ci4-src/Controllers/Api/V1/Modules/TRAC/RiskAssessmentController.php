<?php
namespace App\Controllers\Api\V1\Modules\TRAC;

use App\Controllers\BaseController;
use App\Services\Risk\RiskAssessmentService;

class RiskAssessmentController extends BaseController {
    protected $service;

    public function __construct() {
        $this->service = new RiskAssessmentService();
    }

    public function index() {
        $assessments = $this->service->model->findAll();
        return $this->respond(['success' => true, 'data' => $assessments, 'error' => null]);
    }

    public function create() {
        $data = $this->request->getJSON(true);
        $id = $this->service->createAssessment($data);
        return $this->respond(['success' => true, 'data' => ['id' => $id], 'error' => null], 201);
    }

    public function show($id = null) {
        $assessment = $this->service->model->find($id);
        $measures = $this->service->measureModel->where('assessment_id', $id)->findAll();
        $assessment['control_measures'] = $measures;
        return $this->respond(['success' => true, 'data' => $assessment, 'error' => null]);
    }

    public function update($id = null) {
        $data = $this->request->getJSON(true);
        $this->service->model->update($id, $data);
        return $this->respond(['success' => true, 'data' => null, 'error' => null]);
    }

    public function approve($id) {
        $data = $this->request->getJSON(true);
        $this->service->model->update($id, [
            'status' => 'Approved',
            'approved_by' => $data['user_id'],
            'approved_at' => date('Y-m-d H:i:s')
        ]);
        return $this->respond(['success' => true, 'data' => null, 'error' => null]);
    }

    public function addMeasure($id) {
        $data = $this->request->getJSON(true);
        $measureId = $this->service->addControlMeasure($id, $data);
        return $this->respond(['success' => true, 'data' => ['id' => $measureId], 'error' => null], 201);
    }
}
