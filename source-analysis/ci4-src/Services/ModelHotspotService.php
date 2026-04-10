<?php

namespace App\Services;

use App\Models\ModelHotspotModel;

class ModelHotspotService
{
    protected $hotspotModel;

    public function __construct()
    {
        $this->hotspotModel = new ModelHotspotModel();
    }

    public function createHotspot(array $data): string
    {
        $hotspotId = $this->generateUUID();
        $data['id'] = $hotspotId;
        
        $this->hotspotModel->insert($data);
        return $hotspotId;
    }

    public function getHotspotsByModel(string $modelId): array
    {
        return $this->hotspotModel->where('model_id', $modelId)->findAll();
    }

    public function updateHotspot(string $hotspotId, array $data): bool
    {
        return $this->hotspotModel->update($hotspotId, $data);
    }

    public function deleteHotspot(string $hotspotId): bool
    {
        return $this->hotspotModel->delete($hotspotId);
    }

    public function bulkCreateHotspots(array $hotspots): array
    {
        $created = [];
        foreach ($hotspots as $hotspot) {
            $created[] = $this->createHotspot($hotspot);
        }
        return $created;
    }

    public function autoGenerateHotspots(string $modelId, array $meshNames): array
    {
        // Auto-generate hotspots based on mesh names
        $hotspots = [];
        
        foreach ($meshNames as $meshName) {
            // Try to match mesh name to parts
            $partMatch = $this->findPartByMeshName($meshName);
            
            if ($partMatch) {
                $hotspots[] = [
                    'model_id' => $modelId,
                    'node_type' => 'part',
                    'node_id' => $partMatch['id'],
                    'label' => $partMatch['name'],
                    'mesh_name' => $meshName,
                    'created_by' => session()->get('user_id') ?? 1
                ];
            }
        }

        return $this->bulkCreateHotspots($hotspots);
    }

    private function findPartByMeshName(string $meshName): ?array
    {
        // Simple matching logic - can be enhanced
        $partsModel = new \App\Models\PartsModel();
        
        // Try exact match first
        $part = $partsModel->where('code', $meshName)->first();
        if ($part) return $part;

        // Try partial match
        $part = $partsModel->like('name', $meshName)->first();
        if ($part) return $part;

        return null;
    }

    private function generateUUID(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}