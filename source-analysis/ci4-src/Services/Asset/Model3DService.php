<?php

namespace App\Services\Asset;

use App\Models\Asset3DModelModel;

class Model3DService
{
    protected $model;
    protected $uploadPath = WRITEPATH . 'uploads/3d-models/';

    public function __construct()
    {
        $this->model = new Asset3DModelModel();
        
        if (!is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
        }
    }

    public function upload($assetId, $file)
    {
        if (!$file->isValid()) {
            return ['success' => false, 'message' => 'Invalid file'];
        }

        $ext = $file->getExtension();
        if (!in_array($ext, ['glb', 'gltf', 'obj', 'fbx', 'stl'])) {
            return ['success' => false, 'message' => 'Invalid format'];
        }

        $filename = $assetId . '_' . time() . '.' . $ext;
        $file->move($this->uploadPath, $filename);

        $data = [
            'asset_id' => $assetId,
            'model_file' => '3d-models/' . $filename,
            'format' => $ext,
            'file_size_mb' => $file->getSize() / 1048576,
            'uploaded_at' => date('Y-m-d H:i:s'),
        ];

        $id = $this->model->insert($data);

        return ['success' => true, 'id' => $id, 'file' => $filename];
    }

    public function getModel($assetId)
    {
        return $this->model->getByAsset($assetId);
    }

    public function getModelByAssetId($assetId)
    {
        return $this->model->where('asset_id', $assetId)->first();
    }

    public function addHotspot($modelId, $hotspotData)
    {
        $hotspot = [
            'id' => uniqid('hs_'),
            'name' => $hotspotData['name'],
            'position' => $hotspotData['position'],
            'linked_asset_id' => $hotspotData['linked_asset_id'] ?? null,
            'type' => $hotspotData['type'] ?? 'info',
        ];

        return $this->model->addHotspot($modelId, $hotspot);
    }

    public function getHotspots($modelId)
    {
        return $this->model->getHotspots($modelId);
    }

    public function deleteModel($id)
    {
        $model = $this->model->find($id);
        if ($model && file_exists(WRITEPATH . 'uploads/' . $model['model_file'])) {
            unlink(WRITEPATH . 'uploads/' . $model['model_file']);
        }
        
        return $this->model->delete($id);
    }
}
