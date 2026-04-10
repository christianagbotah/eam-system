<?php

namespace App\Controllers\Api\V1\Modules\MPMP;

use App\Controllers\Api\V1\BaseResourceController;

class ProductionRunsController extends BaseResourceController
{
    protected $modelName = 'App\Models\ProductionRunModel';
    protected $format = 'json';

    public function index()
    {
        return $this->respond([
            'status' => 'success',
            'data' => $this->model->findAll(),
            'message' => 'Production runs retrieved successfully'
        ]);
    }

    public function show($id = null)
    {
        $data = $this->model->find($id);
        if (!$data) {
            return $this->failNotFound('Production run not found');
        }
        return $this->respond([
            'status' => 'success',
            'data' => $data,
            'message' => 'Production run retrieved successfully'
        ]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        if ($this->model->insert($data)) {
            return $this->respondCreated([
                'status' => 'success',
                'data' => ['id' => $this->model->getInsertID()],
                'message' => 'Production run created successfully'
            ]);
        }
        return $this->fail($this->model->errors());
    }

    public function createSurvey($id = null)
    {
        $service = new \App\Services\ProductionSurveyService();
        $data = $this->request->getJSON(true);
        
        // Get user from JWT (TODO: implement proper JWT extraction)
        $userId = $this->request->user_id ?? 1;
        
        $result = $service->createSurvey($id, $data, $userId);
        
        if ($result['status'] === 'success') {
            return $this->respondCreated($result);
        }
        
        return $this->fail($result['message']);
    }

    public function getSurveys($id = null)
    {
        $surveyModel = model('ProductionSurveyModel');
        $surveys = $surveyModel->where('production_run_id', $id)->findAll();
        
        return $this->respond([
            'status' => 'success',
            'data' => $surveys,
            'message' => 'Production surveys retrieved successfully'
        ]);
    }
}
