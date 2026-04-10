<?php

namespace App\Models;

use CodeIgniter\Model;

class AssetHistoryModel extends Model
{
    protected $table = 'asset_history';
    protected $primaryKey = 'id';
    protected $allowedFields = ['asset_type', 'asset_id', 'action', 'user_id', 'changes'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = false;
}
