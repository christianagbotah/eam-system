<?php

namespace App\Models;

use CodeIgniter\Model;

class AssetInventoryLinkModel extends Model
{
    protected $table = 'asset_inventory_links';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'inventory_item_id', 'asset_type', 'asset_id', 'pm_code',
        'pm_name', 'quantity_per_maintenance', 'is_critical_spare'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = null;
}
