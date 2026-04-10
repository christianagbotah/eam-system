<?php

namespace App\Models;

use CodeIgniter\Model;

class AssetModel extends Model
{
    protected $table = 'assets';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'asset_code', 'asset_name', 'asset_type', 'asset_id', 
        'parent_asset_id', 'hierarchy_path', 'status', 'criticality'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
