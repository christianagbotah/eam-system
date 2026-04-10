<?php

namespace App\Models;

use CodeIgniter\Model;

class BomEntryModel extends Model
{
    protected $table = 'bom_entries';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'machine_id',
        'assembly_id', 
        'part_id',
        'qty',
        'unit',
        'reference_location'
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $deletedField = 'deleted_at';

    protected $validationRules = [
        'machine_id' => 'required|integer',
        'qty' => 'required|decimal'
    ];

    protected $validationMessages = [
        'machine_id' => [
            'required' => 'Machine ID is required',
            'integer' => 'Machine ID must be an integer'
        ],
        'qty' => [
            'required' => 'Quantity is required',
            'decimal' => 'Quantity must be a valid number'
        ]
    ];

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
}