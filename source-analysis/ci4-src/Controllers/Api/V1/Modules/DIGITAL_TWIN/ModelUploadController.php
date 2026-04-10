<?php

namespace App\Controllers\Api\V1\Modules\DIGITAL_TWIN;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\ModelService;
use CodeIgniter\HTTP\ResponseInterface;

class ModelUploadController extends BaseApiController
{
    protected $modelService;

    public function __construct()
    {
        parent::__construct();
        $this->modelService = new ModelService();
    }

    public function upload()
    {
        try {
            $machineId = $this->request->getPost('machine_id');
            $modelType = $this->request->getPost('model_type') ?? '3D';
            
            if (!$machineId) {
                return $this->failValidationError('Machine ID is required');
            }

            $file = $this->request->getFile('model_file');
            if (!$file) {
                return $this->failValidationError('Model file is required');
            }

            $modelId = $this->modelService->uploadModel($machineId, $file, $modelType);
            
            // Create default layers
            $this->modelService->createDefaultLayers($modelId, $modelType);

            return $this->respondCreated([
                'model_id' => $modelId,
                'message' => 'Model uploaded successfully'
            ]);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function parse($modelId)
    {
        try {
            $parsedData = $this->modelService->parseModel($modelId);
            
            return $this->respond([
                'model_id' => $modelId,
                'parsed_data' => $parsedData
            ]);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function getModels($machineId)
    {
        try {
            $machineModelModel = new \App\Models\MachineModelModel();
            $models = $machineModelModel->getModelsByMachine($machineId);

            return $this->respond([
                'machine_id' => $machineId,
                'models' => $models
            ]);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function getModel($modelId)
    {
        try {
            $machineModelModel = new \App\Models\MachineModelModel();
            $model = $machineModelModel->getModelWithHotspots($modelId);

            if (!$model) {
                return $this->failNotFound('Model not found');
            }

            return $this->respond($model);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function deleteModel($modelId)
    {
        try {
            $machineModelModel = new \App\Models\MachineModelModel();
            $model = $machineModelModel->find($modelId);

            if (!$model) {
                return $this->failNotFound('Model not found');
            }

            // Delete file
            $filePath = WRITEPATH . $model['file_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }

            // Delete thumbnail
            if ($model['thumbnail_path']) {
                $thumbPath = WRITEPATH . $model['thumbnail_path'];
                if (file_exists($thumbPath)) {
                    unlink($thumbPath);
                }
            }

            // Delete from database (cascades to hotspots and layers)
            $machineModelModel->delete($modelId);

            return $this->respondDeleted(['message' => 'Model deleted successfully']);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }
}
