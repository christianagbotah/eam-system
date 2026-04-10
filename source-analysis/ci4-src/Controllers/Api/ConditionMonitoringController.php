<?php

namespace App\Controllers\API;

use CodeIgniter\RESTful\ResourceController;

class ConditionMonitoringController extends ResourceController
{
    protected $modelName = 'App\Models\ConditionReadingModel';
    protected $format = 'json';

    public function index()
    {
        $readings = $this->model->getLatestReadings();
        return $this->respond(['data' => $readings]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        
        $rules = [
            'asset_id' => 'required|integer',
            'reading_type' => 'required|in_list[vibration,temperature,oil,ultrasonic,thermography]',
            'value' => 'required|decimal',
            'unit' => 'required'
        ];

        if (!$this->validate($rules)) {
            return $this->fail($this->validator->getErrors());
        }

        $id = $this->model->insert($data);
        return $this->respondCreated(['id' => $id, 'message' => 'Reading recorded']);
    }

    public function trends($assetId)
    {
        $type = $this->request->getGet('type') ?? 'vibration';
        $days = $this->request->getGet('days') ?? 30;
        
        $trends = $this->model->getTrends($assetId, $type, $days);
        return $this->respond(['data' => $trends]);
    }

    public function alerts()
    {
        $alerts = $this->model->getActiveAlerts();
        return $this->respond(['data' => $alerts]);
    }

    public function statistics()
    {
        $stats = [
            'total_assets' => $this->model->countMonitoredAssets(),
            'critical_alerts' => $this->model->countAlerts('critical'),
            'warnings' => $this->model->countAlerts('warning'),
            'normal' => $this->model->countAlerts('normal')
        ];
        return $this->respond($stats);
    }
}
