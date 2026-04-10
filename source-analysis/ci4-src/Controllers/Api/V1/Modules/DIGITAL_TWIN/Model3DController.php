<?php

namespace App\Controllers\Api\V1\Modules\DIGITAL_TWIN;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\Asset\Model3DService;

class Model3DController extends BaseApiController
{
    protected $model3DService;

    public function __construct()
    {
        $this->model3DService = new Model3DService();
    }

    public function upload()
    {
        $file = $this->request->getFile('file');
        $assetId = $this->request->getPost('asset_id');

        if (!$file || !$file->isValid()) {
            return $this->fail('Invalid file upload');
        }

        if (!$assetId) {
            return $this->fail('Asset ID is required');
        }

        try {
            $result = $this->model3DService->uploadModel($assetId, $file);
            return $this->respond(['data' => $result]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function getModel($assetId)
    {
        try {
            $model = $this->model3DService->getModelByAssetId($assetId);
            if (!$model) {
                return $this->failNotFound('3D model not found');
            }
            return $this->respond(['data' => $model]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function addHotspot($modelId)
    {
        $data = $this->request->getJSON(true);

        try {
            $result = $this->model3DService->addHotspot($modelId, $data);
            return $this->respond(['data' => $result]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function getHotspots($modelId)
    {
        try {
            $hotspots = $this->model3DService->getHotspots($modelId);
            return $this->respond(['data' => $hotspots]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function delete($modelId = null)
    {
        if (!$modelId) {
            return $this->fail('Model ID is required');
        }
        
        try {
            $result = $this->model3DService->deleteModel($modelId);
            return $this->respond(['success' => $result]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
}
