<?php

namespace App\Models;

use CodeIgniter\Model;

class AssetUsageModel extends Model
{
    protected $table = 'asset_usage_entries';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'asset_node_id',
        'usage_type',
        'usage_value',
        'recorded_at',
        'recorded_by',
        'notes'
    ];

    public function getTotalUsage($nodeId)
    {
        $result = $this->select('usage_type, SUM(usage_value) as total')
                       ->where('asset_node_id', $nodeId)
                       ->groupBy('usage_type')
                       ->findAll();
        
        $usage = ['hours' => 0, 'cycles' => 0, 'quantity' => 0];
        foreach ($result as $row) {
            $usage[$row['usage_type']] = (float)$row['total'];
        }
        
        return $usage;
    }

    public function getAverageUsageRate($nodeId, $usageType, $days = 30)
    {
        $startDate = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        
        $result = $this->selectSum('usage_value')
                       ->where('asset_node_id', $nodeId)
                       ->where('usage_type', $usageType)
                       ->where('recorded_at >=', $startDate)
                       ->first();
        
        $total = $result['usage_value'] ?? 0;
        return $total / $days;
    }
}
