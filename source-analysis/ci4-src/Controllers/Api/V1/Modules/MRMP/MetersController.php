<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\Api\V1\BaseResourceController;
use App\Services\MeterService;
use Config\Services;

class MetersController extends BaseResourceController
{
    protected $meterService;
    protected $request;
    
    public function __construct()
    {
        $this->meterService = new \App\Services\MeterService();
        $this->request = Services::request();
    }

    public function listByNode($nodeType = null, $nodeId = null)
    {
        $nodeType = $nodeType ?? $this->request->getVar('nodeType');
        $nodeId   = (int)($nodeId ?? $this->request->getVar('nodeId'));
        if (!$nodeType || !$nodeId) return $this->failValidationError('nodeType and nodeId are required');
        $res = $this->meterService->listMeters($nodeType, $nodeId);
        return $this->respond($res);
    }

    public function create()
    {
        $payload = $this->request->getJSON(true);
        $res = $this->meterService->createMeter($payload);
        if (!$res['success']) return $this->failValidationError($res['error'] ?? 'create failed');
        return $this->respondCreated($res);
    }

    public function addReading($id = null)
    {
        $payload = $this->request->getJSON(true);
        $value = isset($payload['value']) ? (float)$payload['value'] : null;
        if ($value === null) return $this->failValidationError('value is required');
        $userId = $this->request->getHeaderLine('X-User-Id') ?: null;
        $res = $this->meterService->recordReading((int)$id, $value, $userId);
        if (!$res['success']) return $this->failServerError($res['error'] ?? 'update failed');
        $this->meterService->onMeterUpdated((int)$id);
        return $this->respond($res);
    }

    public function show($id = null)
    {
        $model = new \App\Models\MeterModel();
        $meter = $model->find($id);
        if (!$meter) return $this->failNotFound('Meter not found');
        return $this->respond(['success'=>true,'data'=>$meter]);
    }

    public function readings($id = null)
    {
        $model = new \App\Models\MeterReadingModel();
        $limit = (int)$this->request->getGet('limit') ?: 100;
        $rows  = $model->getByMeter((int)$id, $limit);
        return $this->respond(['success'=>true, 'data'=>$rows]);
    }
}
