<?php

namespace App\Models;

use CodeIgniter\Model;

class EamAssetModel extends Model
{
    protected $table = 'assets';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'App\Entities\Asset';
    protected $useSoftDeletes = false;
    protected $allowedFields = ['asset_code', 'asset_name', 'asset_type', 'asset_id', 'parent_asset_id', 'hierarchy_path', 'status', 'criticality'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'asset_code' => 'required|is_unique[assets.asset_code,id,{id}]',
        'asset_name' => 'required|min_length[3]',
        'asset_type' => 'required|in_list[facility,system,equipment,assembly,component,part]',
    ];

    public function getAssetHierarchy(int $assetId): array
    {
        return $this->select('assets.*, parent.asset_name as parent_name')
            ->join('assets parent', 'parent.id = assets.parent_asset_id', 'left')
            ->where('assets.id', $assetId)
            ->first();
    }

    public function getChildren(int $parentId): array
    {
        return $this->where('parent_asset_id', $parentId)->findAll();
    }
}
