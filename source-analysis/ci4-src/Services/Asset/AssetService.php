<?php

namespace App\Services\Asset;

use App\Models\MachineModel;
use App\Models\AssetHistoryModel;

class AssetService
{
    protected $machineModel;
    protected $historyModel;

    public function __construct()
    {
        $this->machineModel = new MachineModel();
        $this->historyModel = new AssetHistoryModel();
    }

    public function createMachine(array $data, int $userId): array
    {
        $db = \Config\Database::connect();
        
        $insertData = [
            'asset_tag' => $data['asset_tag'] ?? $this->generateAssetTag(),
            'name' => $data['name'] ?? null,
            'model' => $data['model'] ?? null,
            'manufacturer' => $data['manufacturer'] ?? null,
            'serial_number' => $data['serial_number'] ?? null,
            'category' => $data['category'] ?? null,
            'criticality' => $data['criticality'] ?? null,
            'status' => $data['status'] ?? 'active',
            'created_by' => $userId,
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $db->table('machines')->insert($insertData);
        $id = $db->insertID();
        
        $this->logHistory('machine', $id, 'created', $userId, $insertData);
        
        return $db->table('machines')->where('id', $id)->get()->getRowArray();
    }

    public function updateMachine(int $id, array $data, int $userId): array
    {
        $old = $this->machineModel->find($id);
        $data['updated_by'] = $userId;
        
        $this->machineModel->update($id, $data);
        $this->logHistory('machine', $id, 'updated', $userId, ['old' => $old, 'new' => $data]);
        
        return $this->machineModel->find($id);
    }

    public function deleteMachine(int $id, int $userId): bool
    {
        $this->logHistory('machine', $id, 'deleted', $userId, []);
        return $this->machineModel->delete($id);
    }

    protected function generateAssetTag(): string
    {
        return 'AST-' . strtoupper(uniqid());
    }

    protected function logHistory(string $type, int $id, string $action, int $userId, array $changes): void
    {
        $db = \Config\Database::connect();
        $db->table('asset_history')->insert([
            'asset_type' => $type,
            'asset_id' => $id,
            'action' => $action,
            'user_id' => $userId,
            'changes' => json_encode($changes),
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
}
