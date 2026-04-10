<?php

namespace App\Services\Asset;

use App\Models\AssetClosureModel;

class HierarchyService
{
    protected $closureModel;
    protected $db;

    public function __construct()
    {
        $this->closureModel = new AssetClosureModel();
        $this->db = \Config\Database::connect();
    }

    public function getTree($rootId = null)
    {
        $query = $this->db->table('assets_unified a')
            ->select('a.*, COUNT(c.descendant_id) - 1 as child_count')
            ->join('asset_closure c', 'c.ancestor_id = a.id', 'left')
            ->groupBy('a.id');
        
        if ($rootId) {
            $query->where('a.parent_id', $rootId);
        } else {
            $query->where('a.parent_id IS NULL');
        }
        
        $nodes = $query->get()->getResultArray();
        
        foreach ($nodes as &$node) {
            if ($node['child_count'] > 0) {
                $node['children'] = $this->getTree($node['id']);
            }
        }
        
        return $nodes;
    }

    public function getAncestors($assetId)
    {
        return $this->closureModel->getAllAncestors($assetId);
    }

    public function getDescendants($assetId)
    {
        return $this->closureModel->getAllDescendants($assetId);
    }

    public function getBreadcrumb($assetId)
    {
        $ancestors = $this->getAncestors($assetId);
        $current = $this->db->table('assets_unified')->where('id', $assetId)->get()->getRowArray();
        
        $breadcrumb = array_reverse($ancestors);
        if ($current) {
            $breadcrumb[] = $current;
        }
        
        return $breadcrumb;
    }

    public function moveAsset($assetId, $newParentId)
    {
        $this->db->transStart();
        
        // Update parent_id
        $this->db->table('assets_unified')->where('id', $assetId)->update(['parent_id' => $newParentId]);
        
        // Update closure table
        $this->closureModel->moveNode($assetId, $newParentId);
        
        // Update path
        $this->updatePath($assetId);
        
        $this->db->transComplete();
        return $this->db->transStatus();
    }

    private function updatePath($assetId)
    {
        $ancestors = $this->getAncestors($assetId);
        $path = '/' . implode('/', array_column($ancestors, 'id')) . '/' . $assetId;
        
        $this->db->table('assets_unified')->where('id', $assetId)->update(['hierarchy_path' => $path]);
    }

    public function search($query, $type = null, $status = null)
    {
        $builder = $this->db->table('assets_unified')
            ->like('asset_name', $query)
            ->orLike('asset_code', $query);
        
        if ($type) $builder->where('asset_type', $type);
        if ($status) $builder->where('status', $status);
        
        return $builder->limit(50)->get()->getResultArray();
    }
}
