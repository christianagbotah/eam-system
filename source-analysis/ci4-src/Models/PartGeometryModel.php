<?php

namespace App\Models;

use CodeIgniter\Model;

class PartGeometryModel extends Model
{
    protected $table = 'part_geometry';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = false;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'id',
        'part_id',
        'model_id',
        'mesh_name',
        'mapping_confidence',
        'metadata'
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected array $casts = [
        'mapping_confidence' => 'float',
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
        'part_id' => 'required|integer',
        'model_id' => 'required',
        'mapping_confidence' => 'decimal'
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

    public function getMappingsByModel(string $modelId): array
    {
        return $this->where('model_id', $modelId)->findAll();
    }

    public function getMappingsByPart(int $partId): array
    {
        return $this->where('part_id', $partId)->findAll();
    }
}