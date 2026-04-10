<?php

namespace App\Services\Asset;

use App\Models\AssetModel;
use App\Models\AssetClosureModel;
use App\Models\AssetRelationshipModel;

class VisualizationService
{
    protected $assetModel;
    protected $closureModel;
    protected $relationshipModel;

    public function __construct()
    {
        $this->assetModel = new AssetModel();
        $this->closureModel = new AssetClosureModel();
        $this->relationshipModel = new AssetRelationshipModel();
    }

    public function getTreeData($rootId = null)
    {
        $query = $this->assetModel->select('assets.*, c.depth')
            ->join('asset_hierarchy_closure c', 'assets.id = c.descendant_id', 'left');
        
        if ($rootId) {
            $query->where('c.ancestor_id', $rootId);
        }
        
        $assets = $query->orderBy('c.depth', 'ASC')->findAll();
        
        return $this->buildTree($assets, $rootId);
    }

    public function getHealthMatrix()
    {
        return $this->assetModel->select('id, asset_name, status, criticality, created_at')
            ->findAll();
    }

    public function getRelationshipGraph($assetId)
    {
        $nodes = [];
        $edges = [];
        
        $relationships = $this->relationshipModel
            ->where('source_asset_id', $assetId)
            ->orWhere('target_asset_id', $assetId)
            ->findAll();
        
        foreach ($relationships as $rel) {
            $edges[] = [
                'source' => $rel['source_asset_id'],
                'target' => $rel['target_asset_id'],
                'type' => $rel['relationship_type']
            ];
        }
        
        return ['nodes' => $nodes, 'edges' => $edges];
    }

    protected function buildTree($assets, $parentId = null)
    {
        $tree = [];
        foreach ($assets as $asset) {
            if ($asset['parent_asset_id'] == $parentId) {
                $children = $this->buildTree($assets, $asset['id']);
                $node = [
                    'id' => $asset['id'],
                    'name' => $asset['asset_name'],
                    'type' => $asset['asset_type'],
                    'status' => $asset['status']
                ];
                if ($children) {
                    $node['children'] = $children;
                }
                $tree[] = $node;
            }
        }
        return $tree;
    }
}
