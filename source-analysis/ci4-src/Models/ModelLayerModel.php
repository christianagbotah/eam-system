<?php

namespace App\Models;

use CodeIgniter\Model;

class ModelLayerModel extends Model
{
    protected $table = 'model_layers';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = false;
    protected $returnType = 'array';
    protected $allowedFields = [
        'id', 'model_id', 'layer_name', 'layer_order', 'visible_default',
        'color', 'opacity', 'metadata_json'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
