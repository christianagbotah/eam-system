<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\BaseController;
use App\Models\SLADefinitionModel;

class SLAController extends BaseController
{
    protected $slaModel;

    public function __construct()
    {
        $this->slaModel = new SLADefinitionModel();
    }

    public function index()
    {
        $slas = $this->slaModel->getActive();
        return $this->respond(['status' => 'success', 'data' => $slas]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        
        if (!$this->slaModel->insert($data)) {
            return $this->fail($this->slaModel->errors());
        }

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'SLA definition created',
            'data' => ['id' => $this->slaModel->getInsertID()]
        ]);
    }

    public function getByPriority($priority)
    {
        $sla = $this->slaModel->getByPriority($priority);
        
        if (!$sla) {
            return $this->failNotFound('SLA not found for priority: ' . $priority);
        }

        $dueDates = $this->slaModel->calculateDueDates($priority);
        
        return $this->respond([
            'status' => 'success',
            'data' => array_merge($sla, $dueDates)
        ]);
    }
}
