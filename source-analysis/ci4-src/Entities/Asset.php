<?php

namespace App\Entities;

use CodeIgniter\Entity\Entity;

class Asset extends Entity
{
    protected $datamap = [];
    protected $dates = ['created_at', 'updated_at'];
    protected $casts = [
        'id' => 'integer',
        'asset_id' => 'integer',
        'parent_asset_id' => '?integer',
    ];

    public function getFullPath(): string
    {
        return $this->attributes['hierarchy_path'] ?? '';
    }

    public function isActive(): bool
    {
        return $this->attributes['status'] === 'active';
    }

    public function isCritical(): bool
    {
        return in_array($this->attributes['criticality'] ?? '', ['high', 'critical']);
    }
}
