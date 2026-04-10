<?php

namespace App\Models;

use CodeIgniter\Model;

class Asset3DModelModel extends Model
{
    protected $table = 'asset_3d_models';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'asset_id', 'model_file', 'thumbnail_file', 'file_size_mb',
        'format', 'version', 'poly_count', 'hotspots', 'uploaded_by',
        'uploaded_at', 'is_active'
    ];
    protected $useTimestamps = false;
    protected $validationRules = [
        'asset_id' => 'required|integer',
        'model_file' => 'required|max_length[500]',
        'format' => 'required|in_list[gltf,glb,obj,fbx,stl]',
    ];

    public function getByAsset($assetId)
    {
        return $this->where('asset_id', $assetId)
                    ->where('is_active', true)
                    ->first();
    }

    public function getHotspots($modelId)
    {
        $model = $this->find($modelId);
        return $model ? json_decode($model['hotspots'], true) : [];
    }

    public function addHotspot($modelId, $hotspot)
    {
        $model = $this->find($modelId);
        if (!$model) return false;
        
        $hotspots = json_decode($model['hotspots'], true) ?? [];
        $hotspots[] = $hotspot;
        
        return $this->update($modelId, ['hotspots' => json_encode($hotspots)]);
    }
}
