<?php
namespace App\Models\CORE;

use CodeIgniter\Model;

class UserPlantModel extends Model
{
    protected $table = 'user_plants';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'user_id',
        'plant_id',
        'is_primary',
        'created_at'
    ];
    protected $useTimestamps = false;
    
    protected $validationRules = [
        'user_id' => 'required|integer',
        'plant_id' => 'required|integer'
    ];
}
