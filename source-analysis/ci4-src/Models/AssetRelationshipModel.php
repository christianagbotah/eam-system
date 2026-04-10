<?php

namespace App\Models;

use CodeIgniter\Model;

class AssetRelationshipModel extends Model
{
    protected $table = 'asset_relationships';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'source_asset_id', 'target_asset_id', 'relationship_type',
        'strength', 'bidirectional', 'metadata'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = '';

    public function getRelationships($assetId, $type = null)
    {
        $builder = $this->db->table($this->table . ' r')
            ->select('r.*, a1.asset_name as source_name, a2.asset_name as target_name')
            ->join('assets a1', 'a1.id = r.source_asset_id')
            ->join('assets a2', 'a2.id = r.target_asset_id')
            ->groupStart()
                ->where('r.source_asset_id', $assetId)
                ->orWhere('r.target_asset_id', $assetId)
            ->groupEnd();
        
        if ($type) {
            $builder->where('r.relationship_type', $type);
        }
        
        return $builder->get()->getResultArray();
    }

    public function getRelationshipGraph($assetId, $maxDepth = 3)
    {
        $visited = [];
        $graph = ['nodes' => [], 'edges' => []];
        
        $this->buildGraph($assetId, $graph, $visited, 0, $maxDepth);
        
        return $graph;
    }

    private function buildGraph($assetId, &$graph, &$visited, $depth, $maxDepth)
    {
        if ($depth > $maxDepth || in_array($assetId, $visited)) return;
        
        $visited[] = $assetId;
        
        $asset = $this->db->table('assets')->where('id', $assetId)->get()->getRowArray();
        if ($asset) {
            $graph['nodes'][] = [
                'id' => $asset['id'],
                'name' => $asset['asset_name'],
                'type' => $asset['asset_type'],
                'status' => $asset['status']
            ];
        }
        
        $relationships = $this->getRelationships($assetId);
        foreach ($relationships as $rel) {
            $graph['edges'][] = [
                'source' => $rel['source_asset_id'],
                'target' => $rel['target_asset_id'],
                'type' => $rel['relationship_type']
            ];
            
            $nextId = ($rel['source_asset_id'] == $assetId) ? $rel['target_asset_id'] : $rel['source_asset_id'];
            $this->buildGraph($nextId, $graph, $visited, $depth + 1, $maxDepth);
        }
    }
}
