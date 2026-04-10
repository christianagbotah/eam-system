<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\BaseController;
use App\Models\FailureCodeModel;
use App\Models\WorkOrderFailureModel;

class FailureCodeController extends BaseController
{
    protected $failureCodeModel;
    protected $workOrderFailureModel;

    public function __construct()
    {
        $this->failureCodeModel = new FailureCodeModel();
        $this->workOrderFailureModel = new WorkOrderFailureModel();
    }

    public function index()
    {
        $category = $this->request->getGet('category');
        $codes = $category 
            ? $this->failureCodeModel->getByCategory($category)
            : $this->failureCodeModel->getActive();

        return $this->respond(['status' => 'success', 'data' => $codes]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        
        if (!$this->failureCodeModel->insert($data)) {
            return $this->fail($this->failureCodeModel->errors());
        }

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Failure code created',
            'data' => ['id' => $this->failureCodeModel->getInsertID()]
        ]);
    }

    public function recordFailure()
    {
        $data = $this->request->getJSON(true);
        $data['recorded_at'] = $data['recorded_at'] ?? date('Y-m-d H:i:s');
        $data['recorded_by'] = $data['recorded_by'] ?? 1; // Get from JWT

        if (!$this->workOrderFailureModel->insert($data)) {
            return $this->fail($this->workOrderFailureModel->errors());
        }

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Failure recorded',
            'data' => ['id' => $this->workOrderFailureModel->getInsertID()]
        ]);
    }

    public function getWorkOrderFailures($workOrderId)
    {
        $failures = $this->workOrderFailureModel->getByWorkOrder($workOrderId);
        return $this->respond(['status' => 'success', 'data' => $failures]);
    }
}
