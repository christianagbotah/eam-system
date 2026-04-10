<?php

namespace App\Models;

use CodeIgniter\Model;

class MeterModel extends Model
{
    protected $table = 'meters';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'asset_node_type',
        'asset_node_id',
        'meter_type',
        'unit',
        'value',
        'last_read_at'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'asset_node_type' => 'required|in_list[machine,assembly,part]',
        'asset_node_id' => 'required|is_natural_no_zero',
        'meter_type' => 'required|min_length[3]',
        'unit' => 'required',
        'value' => 'numeric'
    ];

    protected $validationMessages = [
        'asset_node_type' => [
            'required' => 'Asset node type is required',
            'in_list' => 'Invalid asset node type'
        ],
        'asset_node_id' => [
            'required' => 'Asset node ID is required',
            'is_natural_no_zero' => 'Invalid asset node ID'
        ],
        'meter_type' => [
            'required' => 'Meter type is required',
            'min_length' => 'Meter type must be at least 3 characters'
        ]
    ];

    protected $skipValidation = false;
    protected $cleanValidationRules = true;
}