<?php

namespace App\Services\Asset;

use App\Models\AssetRelationshipModel;
use App\Models\AssetModel;

class RelationshipGraphService
{
    protected $relationshipModel;
    protected $assetModel;

    public function __construct()
    {
        $this->relationshipModel = new AssetRelationshipModel();
        $this->assetModel = new AssetModel();
    }

    public function getConnectedAssets($assetId, $depth = 1)
    {
        $visited = [];
        $result = $this->traverse($assetId, $depth, $visited);
        return $result;
    }

    public function findPath($sourceId, $targetId)
    {
        $queue = [[$sourceId]];
        $visited = [$sourceId];
        
        while (!empty($queue)) {
            $path = array_shift($queue);
            $node = end($path);
            
            if ($node == $targetId) {
                return $path;
            }
            
            $neighbors = $this->getNeighbors($node);
            foreach ($neighbors as $neighbor) {
                if (!in_array($neighbor, $visited)) {
                    $visited[] = $neighbor;
                    $newPath = $path;
                    $newPath[] = $neighbor;
                    $queue[] = $newPath;
                }
            }
        }
        
        return null;
    }

    protected function traverse($assetId, $depth, &$visited)
    {
        if ($depth <= 0 || in_array($assetId, $visited)) {
            return [];
        }
        
        $visited[] = $assetId;
        $relationships = $this->relationshipModel
            ->where('source_asset_id', $assetId)
            ->orWhere('target_asset_id', $assetId)
            ->findAll();
        
        $result = [];
        foreach ($relationships as $rel) {
            $nextId = $rel['source_asset_id'] == $assetId ? 
                      $rel['target_asset_id'] : $rel['source_asset_id'];
            $result[] = $rel;
            $result = array_merge($result, $this->traverse($nextId, $depth - 1, $visited));
        }
        
        return $result;
    }

    protected function getNeighbors($assetId)
    {
        $relationships = $this->relationshipModel
            ->where('source_asset_id', $assetId)
            ->orWhere('target_asset_id', $assetId)
            ->findAll();
        
        $neighbors = [];
        foreach ($relationships as $rel) {
            $neighbors[] = $rel['source_asset_id'] == $assetId ? 
                          $rel['target_asset_id'] : $rel['source_asset_id'];
        }
        
        return $neighbors;
    }
}
