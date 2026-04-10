<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;

class HierarchyController extends ResourceController
{
    protected $format = 'json';

    public function getTree()
    {
        $db = \Config\Database::connect();
        $rootId = $this->request->getGet('root_id');
        
        $query = $rootId 
            ? "SELECT * FROM asset_hierarchy WHERE parent_id = ? ORDER BY position"
            : "SELECT * FROM asset_hierarchy WHERE parent_id IS NULL ORDER BY position";
        
        $nodes = $rootId 
            ? $db->query($query, [$rootId])->getResultArray()
            : $db->query($query)->getResultArray();
        
        foreach ($nodes as &$node) {
            $node['children'] = $this->getChildren($node['id']);
            $node['asset'] = $db->query("SELECT * FROM assets WHERE id = ?", [$node['asset_id']])->getRowArray();
        }
        
        return $this->respond(['success' => true, 'data' => $nodes]);
    }

    private function getChildren($parentId)
    {
        $db = \Config\Database::connect();
        $children = $db->query("SELECT * FROM asset_hierarchy WHERE parent_id = ? ORDER BY position", [$parentId])->getResultArray();
        
        foreach ($children as &$child) {
            $child['children'] = $this->getChildren($child['id']);
            $child['asset'] = $db->query("SELECT * FROM assets WHERE id = ?", [$child['asset_id']])->getRowArray();
        }
        
        return $children;
    }

    public function getBom($assetId)
    {
        $db = \Config\Database::connect();
        $bom = $db->query("
            SELECT b.*, 
                   pa.name as parent_name,
                   ca.name as child_name,
                   ca.asset_type as child_type
            FROM bom b
            JOIN assets pa ON b.parent_asset_id = pa.id
            JOIN assets ca ON b.child_asset_id = ca.id
            WHERE b.parent_asset_id = ?
            ORDER BY b.position
        ", [$assetId])->getResultArray();
        
        return $this->respond(['success' => true, 'data' => $bom]);
    }

    public function getRelationships($assetId)
    {
        $db = \Config\Database::connect();
        $relationships = $db->query("
            SELECT ar.*, 
                   sa.name as source_name,
                   ta.name as target_name
            FROM asset_relationships ar
            JOIN assets sa ON ar.source_asset_id = sa.id
            JOIN assets ta ON ar.target_asset_id = ta.id
            WHERE ar.source_asset_id = ? OR ar.target_asset_id = ?
        ", [$assetId, $assetId])->getResultArray();
        
        return $this->respond(['success' => true, 'data' => $relationships]);
    }

    public function addToHierarchy()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $parentPath = '/';
        $level = 0;
        
        if ($data['parent_id']) {
            $parent = $db->query("SELECT * FROM asset_hierarchy WHERE id = ?", [$data['parent_id']])->getRowArray();
            $parentPath = $parent['path'];
            $level = $parent['hierarchy_level'] + 1;
        }
        
        $insertData = [
            'parent_id' => $data['parent_id'] ?? null,
            'asset_id' => $data['asset_id'],
            'hierarchy_level' => $level,
            'position' => $data['position'] ?? 0,
            'lft' => 0,
            'rgt' => 0,
        ];
        
        $db->table('asset_hierarchy')->insert($insertData);
        $id = $db->insertID();
        
        $db->query("UPDATE asset_hierarchy SET path = CONCAT(?, ?, '/') WHERE id = ?", [$parentPath, $id, $id]);
        
        return $this->respond(['success' => true, 'id' => $id]);
    }
}
