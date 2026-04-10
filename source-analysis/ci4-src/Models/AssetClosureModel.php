<?php

namespace App\Models;

use CodeIgniter\Model;

class AssetClosureModel extends Model
{
    protected $table = 'asset_hierarchy_closure';
    protected $primaryKey = ['ancestor_id', 'descendant_id'];
    protected $returnType = 'array';
    protected $allowedFields = ['ancestor_id', 'descendant_id', 'depth'];

    public function getAllAncestors($assetId)
    {
        return $this->db->table($this->table . ' c')
            ->select('a.*, c.depth')
            ->join('assets a', 'a.id = c.ancestor_id')
            ->where('c.descendant_id', $assetId)
            ->where('c.depth >', 0)
            ->orderBy('c.depth', 'ASC')
            ->get()
            ->getResultArray();
    }

    public function getAllDescendants($assetId)
    {
        return $this->db->table($this->table . ' c')
            ->select('a.*, c.depth')
            ->join('assets a', 'a.id = c.descendant_id')
            ->where('c.ancestor_id', $assetId)
            ->where('c.depth >', 0)
            ->orderBy('c.depth', 'ASC')
            ->get()
            ->getResultArray();
    }

    public function getChildren($assetId)
    {
        return $this->db->table($this->table . ' c')
            ->select('a.*')
            ->join('assets a', 'a.id = c.descendant_id')
            ->where('c.ancestor_id', $assetId)
            ->where('c.depth', 1)
            ->get()
            ->getResultArray();
    }

    public function insertNode($assetId, $parentId = null)
    {
        $this->db->transStart();
        
        // Self-reference
        $this->db->table($this->table)->insert([
            'ancestor_id' => $assetId,
            'descendant_id' => $assetId,
            'depth' => 0
        ]);
        
        // Copy parent's ancestors
        if ($parentId) {
            $this->db->query("
                INSERT INTO {$this->table} (ancestor_id, descendant_id, depth)
                SELECT ancestor_id, ?, depth + 1
                FROM {$this->table}
                WHERE descendant_id = ?
            ", [$assetId, $parentId]);
        }
        
        $this->db->transComplete();
        return $this->db->transStatus();
    }

    public function moveNode($assetId, $newParentId)
    {
        $this->db->transStart();
        
        // Remove old paths
        $this->db->query("
            DELETE FROM {$this->table}
            WHERE descendant_id IN (
                SELECT descendant_id FROM (
                    SELECT descendant_id FROM {$this->table} WHERE ancestor_id = ?
                ) AS tmp
            )
            AND ancestor_id IN (
                SELECT ancestor_id FROM (
                    SELECT ancestor_id FROM {$this->table}
                    WHERE descendant_id = ? AND ancestor_id != descendant_id
                ) AS tmp2
            )
        ", [$assetId, $assetId]);
        
        // Add new paths
        if ($newParentId) {
            $this->db->query("
                INSERT INTO {$this->table} (ancestor_id, descendant_id, depth)
                SELECT p.ancestor_id, c.descendant_id, p.depth + c.depth + 1
                FROM {$this->table} p, {$this->table} c
                WHERE p.descendant_id = ? AND c.ancestor_id = ?
            ", [$newParentId, $assetId]);
        }
        
        $this->db->transComplete();
        return $this->db->transStatus();
    }
}
