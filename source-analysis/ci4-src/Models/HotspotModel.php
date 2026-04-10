<?php

namespace App\Models;

use CodeIgniter\Model;

class HotspotModel extends Model
{
    protected $table = 'hotspots';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'asset_id',
        'mesh_id',
        'position_x',
        'position_y',
        'position_z',
        'tooltip_text',
        'hotspot_type',
        'is_active'
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected array $casts = [
        'position_x' => 'float',
        'position_y' => 'float',
        'position_z' => 'float',
        'is_active' => 'boolean'
    ];
    protected array $castHandlers = [];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $deletedField = 'deleted_at';

    protected $validationRules = [
        'asset_id' => 'required|is_natural_no_zero',
        'mesh_id' => 'required|max_length[255]',
        'position_x' => 'required|decimal',
        'position_y' => 'required|decimal',
        'position_z' => 'required|decimal',
        'hotspot_type' => 'required|in_list[info,warning,maintenance,part]'
    ];

    protected $validationMessages = [];
    protected $skipValidation = false;
    protected $cleanValidationRules = true;

    protected $allowCallbacks = true;
    protected $beforeInsert = [];
    protected $afterInsert = [];
    protected $beforeUpdate = [];
    protected $afterUpdate = [];
    protected $beforeFind = [];
    protected $afterFind = [];
    protected $beforeDelete = [];
    protected $afterDelete = [];

    public function getHotspotsByAsset($assetId)
    {
        return $this->where('asset_id', $assetId)
                   ->where('is_active', true)
                   ->findAll();
    }
}