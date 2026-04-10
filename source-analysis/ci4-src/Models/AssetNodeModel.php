<?php

namespace App\Models;

use CodeIgniter\Model;

class AssetNodeModel extends Model
{
    protected $table = 'asset_nodes';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'machine_id',
        'parent_id',
        'node_type',
        'node_code',
        'node_name',
        'description',
        'manufacturer',
        'serial_number',
        'expected_lifespan',
        'lifespan_unit',
        'sort_order',
        'image_url',
        'technical_specs'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'machine_id' => 'required|is_natural_no_zero',
        'node_type' => 'required|in_list[machine,assembly,component,sub_component,part,sub_part]',
        'node_code' => 'required|is_unique[asset_nodes.node_code,id,{id}]',
        'node_name' => 'required|min_length[3]|max_length[255]',
    ];

    protected $validationMessages = [];
    protected $skipValidation = false;
    protected $cleanValidationRules = true;

    public function getTree($machineId)
    {
        $nodes = $this->where('machine_id', $machineId)
                      ->orderBy('sort_order', 'ASC')
                      ->findAll();
        
        return $this->buildTree($nodes);
    }

    private function buildTree($nodes, $parentId = null)
    {
        $branch = [];
        foreach ($nodes as $node) {
            if ($node['parent_id'] == $parentId) {
                $children = $this->buildTree($nodes, $node['id']);
                if ($children) {
                    $node['children'] = $children;
                }
                $branch[] = $node;
            }
        }
        return $branch;
    }

    public function getNodeWithDetails($nodeId)
    {
        $node = $this->find($nodeId);
        if (!$node) return null;

        // Get PM tasks
        $pmModel = new \App\Models\AssetPmTaskModel();
        $node['pm_tasks'] = $pmModel->where('asset_node_id', $nodeId)->findAll();

        // Get usage data
        $usageModel = new \App\Models\AssetUsageModel();
        $node['total_usage'] = $usageModel->getTotalUsage($nodeId);
        $node['remaining_life'] = $this->calculateRemainingLife($node);

        // Get spare parts
        $spareModel = new \App\Models\AssetSparePartModel();
        $node['spare_parts'] = $spareModel->where('asset_node_id', $nodeId)->findAll();

        return $node;
    }

    private function calculateRemainingLife($node)
    {
        if (!$node['expected_lifespan']) return null;
        
        $totalUsage = $node['total_usage'][$node['lifespan_unit']] ?? 0;
        $remaining = $node['expected_lifespan'] - $totalUsage;
        
        return [
            'remaining' => max(0, $remaining),
            'percentage' => $node['expected_lifespan'] > 0 
                ? round(($remaining / $node['expected_lifespan']) * 100, 2) 
                : 0
        ];
    }
}
