<?php

namespace App\Models;

use CodeIgniter\Model;

class BOMModel extends Model
{
    protected $table = 'bom';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'parent_asset_id', 'child_asset_id', 'quantity', 'unit', 'position',
        'is_critical', 'is_consumable', 'lead_time_days', 'unit_cost',
        'supplier_id', 'installation_time_minutes', 'notes'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    
    // Get BOM for an asset
    public function getBOM($assetId, $includeAssetDetails = true)
    {
        $builder = $this->builder();
        
        if ($includeAssetDetails) {
            $builder->select('bom.*, a.asset_code, a.asset_name, a.asset_type, a.status');
            $builder->join('assets_unified a', 'a.id = bom.child_asset_id');
        }
        
        $builder->where('bom.parent_asset_id', $assetId);
        $builder->orderBy('bom.position', 'ASC');
        
        return $builder->get()->getResultArray();
    }
    
    // Get BOM explosion (multi-level)
    public function getBOMExplosion($assetId, $maxLevels = 10)
    {
        $result = [];
        $this->explodeBOM($assetId, $result, 0, $maxLevels);
        return $result;
    }
    
    private function explodeBOM($assetId, &$result, $level, $maxLevels)
    {
        if ($level >= $maxLevels) return;
        
        $bom = $this->getBOM($assetId);
        
        foreach ($bom as $item) {
            $item['level'] = $level;
            $item['children'] = [];
            
            // Recursively get children
            $this->explodeBOM($item['child_asset_id'], $item['children'], $level + 1, $maxLevels);
            
            $result[] = $item;
        }
    }
    
    // Where-used query (find where a part is used)
    public function getWhereUsed($assetId)
    {
        $builder = $this->builder();
        $builder->select('bom.*, a.asset_code, a.asset_name, a.asset_type');
        $builder->join('assets_unified a', 'a.id = bom.parent_asset_id');
        $builder->where('bom.child_asset_id', $assetId);
        
        return $builder->get()->getResultArray();
    }
    
    // Calculate total cost
    public function calculateTotalCost($assetId)
    {
        $bom = $this->getBOMExplosion($assetId);
        $totalCost = 0;
        
        foreach ($bom as $item) {
            if (!empty($item['unit_cost'])) {
                $totalCost += $item['unit_cost'] * $item['quantity'];
            }
        }
        
        return $totalCost;
    }
}
