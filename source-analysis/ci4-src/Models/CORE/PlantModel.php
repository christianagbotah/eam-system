<?php
namespace App\Models\CORE;

use CodeIgniter\Model;

class PlantModel extends Model
{
    protected $table = 'plants';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'plant_code',
        'plant_name',
        'location',
        'country',
        'is_active',
        'created_at',
        'updated_at'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    
    protected $validationRules = [
        'plant_code' => 'required|is_unique[plants.plant_code,id,{id}]',
        'plant_name' => 'required|min_length[3]'
    ];
    
    protected $validationMessages = [
        'plant_code' => [
            'required' => 'Plant code is required',
            'is_unique' => 'Plant code already exists'
        ],
        'plant_name' => [
            'required' => 'Plant name is required',
            'min_length' => 'Plant name must be at least 3 characters'
        ]
    ];
}
