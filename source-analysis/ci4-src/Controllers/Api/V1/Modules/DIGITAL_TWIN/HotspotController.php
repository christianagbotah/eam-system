<?php

namespace App\Controllers\Api\V1\Modules\DIGITAL_TWIN;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\HotspotService;

class HotspotController extends BaseApiController
{
    protected $hotspotService;

    public function __construct()
    {
        parent::__construct();
        $this->hotspotService = new HotspotService();
    }

    public function create()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $rules = [
                'model_id' => 'required|integer',
                'node_type' => 'required|in_list[machine,assembly,part,subpart]',
                'node_id' => 'required|integer',
                'label' => 'required|max_length[255]',
                'x' => 'permit_empty|decimal',
                'y' => 'permit_empty|decimal',
                'z' => 'permit_empty|decimal'
            ];

            if (!$this->validate($rules)) {
                return $this->failValidationErrors($this->validator->getErrors());
            }

            $hotspotId = $this->hotspotService->createHotspot($data);

            return $this->respondCreated([
                'hotspot_id' => $hotspotId,
                'message' => 'Hotspot created successfully'
            ]);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function getHotspots($modelId)
    {
        try {
            $hotspots = $this->hotspotService->getHotspotsWithNodeData($modelId);

            return $this->respond([
                'model_id' => $modelId,
                'hotspots' => $hotspots
            ]);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function update($hotspotId)
    {
        try {
            $data = $this->request->getJSON(true);
            
            $success = $this->hotspotService->updateHotspot($hotspotId, $data);

            if (!$success) {
                return $this->failNotFound('Hotspot not found');
            }

            return $this->respond(['message' => 'Hotspot updated successfully']);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function delete($hotspotId)
    {
        try {
            $hotspotModel = new \App\Models\ModelHotspotModel();
            $success = $hotspotModel->delete($hotspotId);

            if (!$success) {
                return $this->failNotFound('Hotspot not found');
            }

            return $this->respondDeleted(['message' => 'Hotspot deleted successfully']);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function autoGenerate()
    {
        try {
            $data = $this->request->getJSON(true);
            $modelId = $data['model_id'] ?? null;
            $machineId = $data['machine_id'] ?? null;

            if (!$modelId || !$machineId) {
                return $this->failValidationError('Model ID and Machine ID are required');
            }

            $success = $this->hotspotService->autoGenerateHotspots($modelId, $machineId);

            if (!$success) {
                return $this->failServerError('Failed to generate hotspots');
            }

            return $this->respond(['message' => 'Hotspots generated successfully']);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function getNavigation($hotspotId)
    {
        try {
            $navigation = $this->hotspotService->getHotspotNavigation($hotspotId);

            if (!$navigation) {
                return $this->failNotFound('Hotspot not found');
            }

            return $this->respond($navigation);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function bulkCreate()
    {
        try {
            $data = $this->request->getJSON(true);
            $modelId = $data['model_id'] ?? null;
            $hotspots = $data['hotspots'] ?? [];

            if (!$modelId || empty($hotspots)) {
                return $this->failValidationError('Model ID and hotspots array are required');
            }

            $success = $this->hotspotService->bulkCreateHotspots($modelId, $hotspots);

            if (!$success) {
                return $this->failServerError('Failed to create hotspots');
            }

            return $this->respondCreated(['message' => 'Hotspots created successfully']);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }
}
