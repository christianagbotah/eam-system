<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;

class OeeController extends ResourceController
{
    protected $modelName = 'App\Models\OeeModel';
    protected $format = 'json';

    // Calculate OEE for asset/shift
    public function calculate()
    {
        $assetId = $this->request->getGet('asset_id');
        $date = $this->request->getGet('date') ?? date('Y-m-d');
        $shift = $this->request->getGet('shift') ?? 'Day';

        $oee = $this->model->calculateOee($assetId, $date, $shift);
        
        return $this->respond(['success' => true, 'data' => $oee]);
    }

    // Get OEE metrics
    public function metrics()
    {
        $assetId = $this->request->getGet('asset_id');
        $startDate = $this->request->getGet('start_date') ?? date('Y-m-d', strtotime('-7 days'));
        $endDate = $this->request->getGet('end_date') ?? date('Y-m-d');
        $groupBy = $this->request->getGet('group_by') ?? 'day';

        $metrics = $this->model->getMetrics($assetId, $startDate, $endDate, $groupBy);
        
        return $this->respond(['success' => true, 'data' => $metrics]);
    }

    // Log downtime event
    public function logDowntime()
    {
        $data = $this->request->getJSON(true);
        
        $downtimeId = $this->model->logDowntime([
            'asset_id' => $data['asset_id'],
            'reason_code_id' => $data['reason_code_id'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'] ?? null,
            'notes' => $data['notes'] ?? null,
            'reported_by' => $data['reported_by'],
            'work_order_id' => $data['work_order_id'] ?? null,
        ]);

        return $this->respond(['success' => true, 'id' => $downtimeId]);
    }

    // Log production count
    public function logProduction()
    {
        $data = $this->request->getJSON(true);
        
        $id = $this->model->logProduction([
            'asset_id' => $data['asset_id'],
            'good_count' => $data['good_count'],
            'reject_count' => $data['reject_count'] ?? 0,
            'shift_name' => $data['shift_name'],
            'operator_id' => $data['operator_id'] ?? null,
        ]);

        return $this->respond(['success' => true, 'id' => $id]);
    }

    // Get downtime analysis
    public function downtimeAnalysis()
    {
        $assetId = $this->request->getGet('asset_id');
        $startDate = $this->request->getGet('start_date') ?? date('Y-m-d', strtotime('-30 days'));
        $endDate = $this->request->getGet('end_date') ?? date('Y-m-d');

        $analysis = $this->model->getDowntimeAnalysis($assetId, $startDate, $endDate);
        
        return $this->respond(['success' => true, 'data' => $analysis]);
    }

    // Get asset targets
    public function targets($assetId = null)
    {
        if ($assetId) {
            $target = $this->model->getAssetTarget($assetId);
            return $this->respond(['success' => true, 'data' => $target]);
        }
        
        $targets = $this->model->getAllTargets();
        return $this->respond(['success' => true, 'data' => $targets]);
    }

    // Update asset target
    public function updateTarget($assetId)
    {
        $data = $this->request->getJSON(true);
        
        $this->model->updateAssetTarget($assetId, $data);
        
        return $this->respond(['success' => true, 'message' => 'Target updated']);
    }

    // Get downtime reasons
    public function downtimeReasons()
    {
        $reasons = $this->model->getDowntimeReasons();
        return $this->respond(['success' => true, 'data' => $reasons]);
    }

    // Dashboard summary
    public function dashboard()
    {
        $assetId = $this->request->getGet('asset_id');
        $date = $this->request->getGet('date') ?? date('Y-m-d');

        $summary = $this->model->getDashboardSummary($assetId, $date);
        
        return $this->respond(['success' => true, 'data' => $summary]);
    }
}
