<?php

namespace App\Models;

use CodeIgniter\Model;

class AssemblyModel extends Model
{
    protected $table = 'assemblies';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'equipment_id',
        'assembly_code',
        'assembly_name',
        'assembly_category',
        'description',
        'criticality',
        'status',
        'assembly_image'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'equipment_id' => 'required|is_natural_no_zero',
        'assembly_name' => 'required|min_length[3]',
        'assembly_code' => 'required|is_unique[assemblies.assembly_code,id,{id}]',
        'status' => 'in_list[active,inactive]',
        'criticality' => 'in_list[low,medium,high,critical]'
    ];

    protected $validationMessages = [
        'equipment_id' => [
            'required' => 'Machine is required',
            'is_natural_no_zero' => 'Invalid machine selected'
        ],
        'assembly_name' => [
            'required' => 'Assembly name is required',
            'min_length' => 'Assembly name must be at least 3 characters'
        ],
        'assembly_code' => [
            'required' => 'Assembly code is required',
            'is_unique' => 'Assembly code already exists'
        ]
    ];

    protected $skipValidation = false;
    protected $cleanValidationRules = true;
}
