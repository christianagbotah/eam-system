<?php

namespace App\Models;

use CodeIgniter\Model;

class ModelHotspotModel extends Model
{
    protected $table = 'model_hotspots';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = false;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'id',
        'model_id',
        'node_type',
        'node_id',
        'label',
        'shape',
        'coords',
        'mesh_name',
        'world_coords',
        'metadata',
        'created_by'
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected array $casts = [
        'coords' => 'json',
        'world_coords' => 'json',
        'metadata' => 'json'
    ];
    protected array $castHandlers = [];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    // Validation
    protected $validationRules = [
        'model_id' => 'required',
        'node_type' => 'required|in_list[machine,assembly,part]',
        'node_id' => 'required|integer',
        'label' => 'required|max_length[255]',
        'created_by' => 'required|integer'
    ];
    protected $validationMessages = [];
    protected $skipValidation = false;
    protected $cleanValidationRules = true;

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert = [];
    protected $afterInsert = [];
    protected $beforeUpdate = [];
    protected $afterUpdate = [];
    protected $beforeFind = [];
    protected $afterFind = [];
    protected $beforeDelete = [];
    protected $afterDelete = [];

    public function getHotspotsByModel(string $modelId): array
    {
        return $this->where('model_id', $modelId)->findAll();
    }

    public function getHotspotsByNode(string $nodeType, int $nodeId): array
    {
        return $this->where('node_type', $nodeType)
                   ->where('node_id', $nodeId)
                   ->findAll();
    }
}