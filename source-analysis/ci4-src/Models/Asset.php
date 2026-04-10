<?php

namespace App\Models;

use CodeIgniter\Model;

class Asset extends Model
{
    protected $table = 'assets';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'asset_code', 'asset_name', 'asset_type', 'asset_id',
        'parent_asset_id', 'hierarchy_path', 'status', 'criticality'
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'asset_code' => 'required|is_unique[assets.asset_code]|max_length[50]',
        'asset_name' => 'required|max_length[255]',
        'asset_type' => 'in_list[facility,system,equipment,assembly,component,part]'
    ];

    public function workOrders()
    {
        return $this->hasMany(WorkOrder::class, 'asset_id');
    }

    public function parent()
    {
        return $this->belongsTo(Asset::class, 'parent_asset_id');
    }

    public function children()
    {
        return $this->hasMany(Asset::class, 'parent_asset_id');
    }
}