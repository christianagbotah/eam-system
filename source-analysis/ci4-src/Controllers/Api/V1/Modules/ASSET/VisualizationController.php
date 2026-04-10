<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\Asset\VisualizationService;

class VisualizationController extends BaseApiController
{
    protected $visualizationService;

    public function __construct()
    {
        $this->visualizationService = new VisualizationService();
    }

    public function getTreeData($rootId = null)
    {
        try {
            $tree = $this->visualizationService->getTreeData($rootId);
            return $this->respond(['data' => $tree]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function getHealthMatrix()
    {
        try {
            $matrix = $this->visualizationService->getHealthMatrix();
            return $this->respond(['data' => $matrix]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function getRelationshipGraph($assetId)
    {
        try {
            $graph = $this->visualizationService->getRelationshipGraph($assetId);
            return $this->respond(['data' => $graph]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
}
