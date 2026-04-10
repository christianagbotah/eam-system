<?php

namespace App\Controllers\Api\V1\Modules\DIGITAL_TWIN;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\MachineModelModel;
use App\Models\ModelLayerModel;
use App\Models\PartGeometryModel;

class ModelViewerController extends BaseApiController
{
    public function getViewerData($modelId)
    {
        try {
            $machineModelModel = new MachineModelModel();
            $model = $machineModelModel->getModelWithHotspots($modelId);

            if (!$model) {
                return $this->failNotFound('Model not found');
            }

            // Get geometry data for 3D models
            if ($model['model_type'] === '3D') {
                $partGeometryModel = new PartGeometryModel();
                $geometries = $partGeometryModel->where('part_id IN (SELECT node_id FROM model_hotspots WHERE model_id = ? AND node_type = "part")', [$modelId])->findAll();
                $model['geometries'] = $geometries;
            }

            return $this->respond($model);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function updateLayerVisibility($modelId)
    {
        try {
            $data = $this->request->getJSON(true);
            $layerVisibility = $data['layers'] ?? [];

            $layerModel = new ModelLayerModel();
            
            foreach ($layerVisibility as $layerId => $visible) {
                $layerModel->update($layerId, ['visible_default' => $visible]);
            }

            return $this->respond(['message' => 'Layer visibility updated']);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function saveViewState($modelId)
    {
        try {
            $data = $this->request->getJSON(true);
            $userId = $this->getUserId();

            $navigationModel = new \App\Models\ModelNavigationHistoryModel();
            
            $navigationData = [
                'user_id' => $userId,
                'model_id' => $modelId,
                'navigation_path' => json_encode($data['navigation_path'] ?? []),
                'view_state' => json_encode($data['view_state'] ?? [])
            ];

            $navigationModel->insert($navigationData);

            return $this->respond(['message' => 'View state saved']);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function getViewHistory($modelId)
    {
        try {
            $userId = $this->getUserId();
            
            $navigationModel = new \App\Models\ModelNavigationHistoryModel();
            $history = $navigationModel->where('user_id', $userId)
                                     ->where('model_id', $modelId)
                                     ->orderBy('timestamp', 'DESC')
                                     ->limit(10)
                                     ->findAll();

            return $this->respond(['history' => $history]);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function assignPMTask()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $rules = [
                'hotspot_id' => 'required|integer',
                'pm_template_id' => 'required|integer',
                'frequency_days' => 'required|integer'
            ];

            if (!$this->validate($rules)) {
                return $this->failValidationErrors($this->validator->getErrors());
            }

            // Get hotspot details
            $hotspotModel = new \App\Models\ModelHotspotModel();
            $hotspot = $hotspotModel->find($data['hotspot_id']);

            if (!$hotspot) {
                return $this->failNotFound('Hotspot not found');
            }

            // Create PM task assignment
            $pmTaskModel = new \App\Models\PmTaskModel();
            $taskData = [
                'pm_template_id' => $data['pm_template_id'],
                'asset_id' => $hotspot['node_id'],
                'asset_type' => $hotspot['node_type'],
                'frequency_days' => $data['frequency_days'],
                'next_due_date' => date('Y-m-d', strtotime('+' . $data['frequency_days'] . ' days')),
                'status' => 'active',
                'metadata_json' => json_encode([
                    'hotspot_id' => $data['hotspot_id'],
                    'assigned_from_model' => true
                ])
            ];

            $taskId = $pmTaskModel->insert($taskData);

            return $this->respondCreated([
                'task_id' => $taskId,
                'message' => 'PM task assigned successfully'
            ]);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function getModelFile($modelId)
    {
        try {
            $machineModelModel = new MachineModelModel();
            $model = $machineModelModel->find($modelId);

            if (!$model) {
                return $this->failNotFound('Model not found');
            }

            $filePath = WRITEPATH . $model['file_path'];
            
            if (!file_exists($filePath)) {
                return $this->failNotFound('Model file not found');
            }

            return $this->response->download($filePath, null);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function getLayersByModel($modelId)
    {
        try {
            $layerModel = new ModelLayerModel();
            $layers = $layerModel->getLayersByModel($modelId);

            return $this->respond(['layers' => $layers]);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function syncViewState($modelId)
    {
        try {
            $data = $this->request->getJSON(true);
            $userId = $this->getUserId();

            // Broadcast view state to other connected users
            // This would typically use WebSockets or Server-Sent Events
            
            return $this->respond(['message' => 'View state synced']);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    protected function getUserId()
    {
        // Get user ID from JWT token or session
        $token = $this->request->getHeaderLine('Authorization');
        if ($token) {
            $token = str_replace('Bearer ', '', $token);
            // Decode JWT and get user ID
            // This is a placeholder - implement actual JWT decoding
            return 1;
        }
        return 1;
    }
}
