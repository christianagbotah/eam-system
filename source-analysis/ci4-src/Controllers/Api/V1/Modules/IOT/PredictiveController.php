<?php

namespace App\Controllers\Api\V1\Modules\IOT;

use App\Controllers\Api\V1\BaseResourceController;
use App\Services\PredictiveService;

class PredictiveController extends BaseResourceController
{
    protected $predictiveService;

    public function __construct()
    {
        $this->predictiveService = new PredictiveService();
    }

    public function calculateHealth($assetId)
    {
        $result = $this->predictiveService->calculateHealthScore($assetId);
        return $this->respond($result);
    }

    public function detectAnomalies($assetId)
    {
        $anomalies = $this->predictiveService->detectAnomalies($assetId);
        return $this->respond(['anomalies' => $anomalies, 'count' => count($anomalies)]);
    }

    public function assetsAtRisk()
    {
        $assets = $this->predictiveService->getAssetsAtRisk();
        return $this->respond(['assets' => $assets, 'count' => count($assets)]);
    }

    public function runPredictions()
    {
        $assets = model('AssetModel')->findAll();
        $results = [];

        foreach ($assets as $asset) {
            $results[] = $this->predictiveService->calculateHealthScore($asset['id']);
        }

        return $this->respond(['processed' => count($results), 'results' => $results]);
    }
}
