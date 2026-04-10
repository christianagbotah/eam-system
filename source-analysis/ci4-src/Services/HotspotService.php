<?php

namespace App\Services;

use App\Models\ModelHotspotModel;
use App\Models\MachineModel;
use App\Models\AssemblyModel;
use App\Models\PartModel;

class HotspotService
{
    protected $hotspotModel;

    public function __construct()
    {
        $this->hotspotModel = new ModelHotspotModel();
    }

    public function createHotspot($data)
    {
        // Validate node exists
        if (!$this->validateNode($data['node_type'], $data['node_id'])) {
            throw new \Exception('Referenced node does not exist');
        }

        return $this->hotspotModel->insert($data);
    }

    public function updateHotspot($hotspotId, $data)
    {
        if (isset($data['node_type']) && isset($data['node_id'])) {
            if (!$this->validateNode($data['node_type'], $data['node_id'])) {
                throw new \Exception('Referenced node does not exist');
            }
        }

        return $this->hotspotModel->update($hotspotId, $data);
    }

    public function getHotspotsWithNodeData($modelId)
    {
        $hotspots = $this->hotspotModel->getHotspotsByModel($modelId);
        
        foreach ($hotspots as &$hotspot) {
            $hotspot['node_data'] = $this->getNodeData($hotspot['node_type'], $hotspot['node_id']);
        }

        return $hotspots;
    }

    public function getHotspotsByLayer($modelId, $layerName)
    {
        return $this->hotspotModel->where('model_id', $modelId)
                                 ->like('metadata_json', '"layer":"' . $layerName . '"')
                                 ->where('is_active', true)
                                 ->findAll();
    }

    public function bulkCreateHotspots($modelId, $hotspots)
    {
        $this->hotspotModel->db->transStart();

        foreach ($hotspots as $hotspot) {
            $hotspot['model_id'] = $modelId;
            $this->createHotspot($hotspot);
        }

        $this->hotspotModel->db->transComplete();
        return $this->hotspotModel->db->transStatus();
    }

    public function autoGenerateHotspots($modelId, $machineId)
    {
        // Auto-generate hotspots based on machine hierarchy
        $hotspots = [];

        // Get machine assemblies
        $assemblyModel = new AssemblyModel();
        $assemblies = $assemblyModel->where('machine_id', $machineId)->findAll();

        foreach ($assemblies as $assembly) {
            $hotspots[] = [
                'model_id' => $modelId,
                'node_type' => 'assembly',
                'node_id' => $assembly['id'],
                'label' => $assembly['name'],
                'x' => rand(10, 90) / 100, // Random positions - should be calculated
                'y' => rand(10, 90) / 100,
                'z' => rand(10, 90) / 100,
                'metadata_json' => json_encode([
                    'auto_generated' => true,
                    'assembly_code' => $assembly['code'] ?? null
                ])
            ];

            // Get parts for this assembly
            $partModel = new PartModel();
            $parts = $partModel->where('assembly_id', $assembly['id'])->findAll();

            foreach ($parts as $part) {
                $hotspots[] = [
                    'model_id' => $modelId,
                    'node_type' => 'part',
                    'node_id' => $part['id'],
                    'label' => $part['name'],
                    'x' => rand(10, 90) / 100,
                    'y' => rand(10, 90) / 100,
                    'z' => rand(10, 90) / 100,
                    'metadata_json' => json_encode([
                        'auto_generated' => true,
                        'part_number' => $part['part_number'] ?? null,
                        'assembly_id' => $assembly['id']
                    ])
                ];
            }
        }

        return $this->bulkCreateHotspots($modelId, $hotspots);
    }

    protected function validateNode($nodeType, $nodeId)
    {
        switch ($nodeType) {
            case 'machine':
                $model = new MachineModel();
                break;
            case 'assembly':
                $model = new AssemblyModel();
                break;
            case 'part':
            case 'subpart':
                $model = new PartModel();
                break;
            default:
                return false;
        }

        return $model->find($nodeId) !== null;
    }

    protected function getNodeData($nodeType, $nodeId)
    {
        switch ($nodeType) {
            case 'machine':
                $model = new MachineModel();
                break;
            case 'assembly':
                $model = new AssemblyModel();
                break;
            case 'part':
            case 'subpart':
                $model = new PartModel();
                break;
            default:
                return null;
        }

        return $model->find($nodeId);
    }

    public function getHotspotNavigation($hotspotId)
    {
        $hotspot = $this->hotspotModel->getHotspotWithNodeData($hotspotId);
        if (!$hotspot) return null;

        $navigation = [
            'current' => $hotspot,
            'parent' => null,
            'children' => [],
            'siblings' => []
        ];

        // Get parent based on hierarchy
        if ($hotspot['node_type'] === 'part') {
            $partModel = new PartModel();
            $part = $partModel->find($hotspot['node_id']);
            if ($part && isset($part['assembly_id'])) {
                $navigation['parent'] = $this->hotspotModel->where('node_type', 'assembly')
                                                          ->where('node_id', $part['assembly_id'])
                                                          ->where('model_id', $hotspot['model_id'])
                                                          ->first();
            }
        }

        // Get children based on hierarchy
        if ($hotspot['node_type'] === 'assembly') {
            $navigation['children'] = $this->hotspotModel->where('node_type', 'part')
                                                        ->where('model_id', $hotspot['model_id'])
                                                        ->like('metadata_json', '"assembly_id":' . $hotspot['node_id'])
                                                        ->findAll();
        }

        return $navigation;
    }
}