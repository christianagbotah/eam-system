<?php

namespace App\Models;

use CodeIgniter\Model;

class AssetSparePartModel extends Model
{
    protected $table = 'asset_spare_parts';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'asset_node_id',
        'inventory_item_id',
        'part_number',
        'quantity_required'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
}
