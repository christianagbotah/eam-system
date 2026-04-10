<?php

namespace App\Services\Asset;

use App\Models\AssemblyModel;
use App\Models\AssetHistoryModel;

class AssemblyService
{
    protected $assemblyModel;
    protected $historyModel;

    public function __construct()
    {
        $this->assemblyModel = new AssemblyModel();
        $this->historyModel = new AssetHistoryModel();
    }

    public function create(array $data, int $userId): array
    {
        $db = \Config\Database::connect();
        
        $insertData = [
            'equipment_id' => $data['machine_id'] ?? null,
            'assembly_code' => $data['code'] ?? 'ASM-' . strtoupper(uniqid()),
            'assembly_name' => $data['name'] ?? null,
            'description' => $data['description'] ?? null,
            'status' => 'active',
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $db->table('assemblies')->insert($insertData);
        $id = $db->insertID();
        
        $this->logHistory($id, 'created', $userId, $insertData);
        
        return $db->table('assemblies')->where('id', $id)->get()->getRowArray();
    }

    public function update(int $id, array $data, int $userId): array
    {
        $old = $this->assemblyModel->find($id);
        $this->assemblyModel->update($id, $data);
        $this->logHistory($id, 'updated', $userId, ['old' => $old, 'new' => $data]);
        return $this->assemblyModel->find($id);
    }

    protected function logHistory(int $id, string $action, int $userId, array $changes): void
    {
        $db = \Config\Database::connect();
        $db->table('asset_history')->insert([
            'asset_type' => 'assembly',
            'asset_id' => $id,
            'action' => $action,
            'user_id' => $userId,
            'changes' => json_encode($changes),
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
}
