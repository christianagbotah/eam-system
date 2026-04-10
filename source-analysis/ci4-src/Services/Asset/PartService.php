<?php

namespace App\Services\Asset;

use App\Models\PartModel;
use App\Models\AssetHistoryModel;

class PartService
{
    protected $partModel;
    protected $historyModel;

    public function __construct()
    {
        $this->partModel = new PartModel();
        $this->historyModel = new AssetHistoryModel();
    }

    public function create(array $data, int $userId): array
    {
        $db = \Config\Database::connect();
        
        $insertData = [
            'component_id' => $data['assembly_id'] ?? null,
            'part_number' => $data['part_number'] ?? 'PART-' . strtoupper(uniqid()),
            'part_name' => $data['name'] ?? null,
            'description' => $data['description'] ?? null,
            'manufacturer' => $data['manufacturer'] ?? null,
            'status' => 'active',
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $db->table('parts')->insert($insertData);
        $id = $db->insertID();
        
        $this->logHistory($id, 'created', $userId, $insertData);
        
        return $db->table('parts')->where('id', $id)->get()->getRowArray();
    }

    public function update(int $id, array $data, int $userId): array
    {
        $old = $this->partModel->find($id);
        $this->partModel->update($id, $data);
        $this->logHistory($id, 'updated', $userId, ['old' => $old, 'new' => $data]);
        return $this->partModel->find($id);
    }

    public function getTree(int $partId): array
    {
        $part = $this->partModel->find($partId);
        $children = $this->partModel->where('parent_part_id', $partId)->findAll();
        
        $part['children'] = array_map(fn($child) => $this->getTree($child['id']), $children);
        return $part;
    }

    protected function logHistory(int $id, string $action, int $userId, array $changes): void
    {
        $db = \Config\Database::connect();
        $db->table('asset_history')->insert([
            'asset_type' => 'part',
            'asset_id' => $id,
            'action' => $action,
            'user_id' => $userId,
            'changes' => json_encode($changes),
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
}
