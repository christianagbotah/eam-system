<?php

namespace App\Models;

use CodeIgniter\Model;

class PartModel extends Model
{
    protected $table = 'parts';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'component_id',
        'parent_part_id',
        'part_number',
        'part_code',
        'part_name',
        'part_category',
        'description',
        'manufacturer',
        'material',
        'dimensions',
        'expected_lifespan',
        'spare_availability',
        'current_stock_qty',
        'safety_notes',
        'failure_modes',
        'unit_cost',
        'quantity',
        'criticality',
        'status',
        'part_image'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'component_id' => 'required|is_natural_no_zero',
        'part_name' => 'required|min_length[3]',
        'part_number' => 'required|is_unique[parts.part_number,id,{id}]',
        'status' => 'in_list[active,inactive,obsolete]',
        'spare_availability' => 'in_list[yes,no]'
    ];

    protected $validationMessages = [
        'component_id' => [
            'required' => 'Assembly is required',
            'is_natural_no_zero' => 'Invalid assembly selected'
        ],
        'part_name' => [
            'required' => 'Part name is required',
            'min_length' => 'Part name must be at least 3 characters'
        ],
        'part_number' => [
            'required' => 'Part number is required',
            'is_unique' => 'Part number already exists'
        ]
    ];

    protected $skipValidation = false;
    protected $cleanValidationRules = true;
}
