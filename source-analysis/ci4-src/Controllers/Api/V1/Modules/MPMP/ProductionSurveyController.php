<?php

namespace App\Controllers\Api\V1\Modules\MPMP;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\ProductionSurveyModel;
use App\Services\ProductionSurvey\ProductionSurveyService;

class ProductionSurveyController extends BaseApiController
{
    protected $surveyModel;
    protected $surveyService;

    public function __construct()
    {
        parent::__construct();
        $this->surveyModel = new ProductionSurveyModel();
        $this->surveyService = new ProductionSurveyService();
    }

    public function index()
    {
        if ($error = $this->requirePermission('production.view')) return $error;
        $surveys = $this->surveyModel->getWithDetails($this->request->getGet());
        return $this->respondSuccess($surveys);
    }

    public function show($id = null)
    {
        if ($error = $this->requirePermission('production.view')) return $error;
        $survey = $this->surveyModel->find($id);
        if (!$survey) return $this->respondError('Survey not found', null, 404);
        return $this->respondSuccess($survey);
    }

    public function create()
    {
        if ($error = $this->requirePermission('production.create')) return $error;
        $data = $this->validatePlantInRequest($this->request->getJSON(true));
        if ($data instanceof \CodeIgniter\HTTP\ResponseInterface) return $data;
        
        try {
            $surveyId = $this->surveyService->createSurvey($data, session()->get('user_id'));
            $this->auditLog('create', 'production_survey', $surveyId, $data);
            return $this->respondSuccess(['id' => $surveyId], 'Survey created successfully');
        } catch (\Exception $e) {
            return $this->respondError($e->getMessage());
        }
    }

    public function update($id = null)
    {
        if ($error = $this->requirePermission('production.update')) return $error;
        $data = $this->request->getJSON(true);
        unset($data['plant_id']);
        
        try {
            $this->surveyService->updateSurvey($id, $data, session()->get('user_id'));
            $this->auditLog('update', 'production_survey', $id, $data);
            return $this->respondSuccess(null, 'Survey updated successfully');
        } catch (\Exception $e) {
            return $this->respondError($e->getMessage());
        }
    }

    public function delete($id = null)
    {
        if ($error = $this->requirePermission('production.delete')) return $error;
        if ($this->surveyModel->delete($id)) {
            $this->auditLog('delete', 'production_survey', $id);
            return $this->respondSuccess(null, 'Survey deleted successfully');
        }
        return $this->respondError('Failed to delete survey', null, 400);
    }

    public function submit($id)
    {
        if ($error = $this->requirePermission('production.submit')) return $error;
        try {
            $this->surveyService->submitSurvey($id, session()->get('user_id'));
            $this->auditLog('submit', 'production_survey', $id);
            return $this->respondSuccess(null, 'Survey submitted successfully');
        } catch (\Exception $e) {
            return $this->respondError($e->getMessage());
        }
    }

    public function approve($id)
    {
        if ($error = $this->requirePermission('production.approve')) return $error;
        try {
            $this->surveyService->approveSurvey($id, session()->get('user_id'));
            $this->auditLog('approve', 'production_survey', $id);
            return $this->respondSuccess(null, 'Survey approved successfully');
        } catch (\Exception $e) {
            return $this->respondError($e->getMessage());
        }
    }

    public function reject($id)
    {
        if ($error = $this->requirePermission('production.reject')) return $error;
        $data = $this->request->getJSON(true);
        try {
            $this->surveyService->rejectSurvey($id, session()->get('user_id'), $data['reason'] ?? '');
            $this->auditLog('reject', 'production_survey', $id, $data);
            return $this->respondSuccess(null, 'Survey rejected successfully');
        } catch (\Exception $e) {
            return $this->respondError($e->getMessage());
        }
    }

    public function kpis()
    {
        if ($error = $this->requirePermission('production.view')) return $error;
        $kpis = $this->surveyService->getKPIs($this->request->getGet());
        return $this->respondSuccess($kpis);
    }
}
