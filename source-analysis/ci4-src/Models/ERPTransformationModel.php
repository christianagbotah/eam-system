<?php

namespace App\Models;

use CodeIgniter\Model;

class ERPTransformationModel extends Model
{
    protected $table = 'erp_transformations';
    protected $primaryKey = 'id';
    protected $allowedFields = ['entity_type', 'field_name', 'transformation_type', 'transformation_rule', 'direction', 'is_active'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    
    protected $casts = [
        'transformation_rule' => 'json',
        'is_active' => 'boolean'
    ];
}
