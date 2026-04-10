<?php

namespace App\Services;

use App\Models\MachineModel;
use App\Models\AssemblyModel;
use App\Models\PartModel;
use App\Models\ModelHotspotModel;
use App\Models\PartGeometryModel;

class DataLinkingService
{
    protected $machineModel;
    protected $assemblyModel;
    protected $partModel;
    protected $hotspotModel;
    protected $geometryModel;

    public function __construct()
    {
        $this->machineModel = new MachineModel();
        $this->assemblyModel = new AssemblyModel();
        $this->partModel = new PartModel();
        $this->hotspotModel = new ModelHotspotModel();
        $this->geometryModel = new PartGeometryModel();
    }

    public function autoMapMachineHierarchy($machineId, $modelId)
    {
        $mappings = [];

        // Get machine data
        $machine = $this->machineModel->find($machineId);
        if (!$machine) return $mappings;

        // Map machine as root node
        $mappings[] = [
            'node_type' => 'machine',
            'node_id' => $machineId,
            'label' => $machine['name'],
            'auto_mapped' => true
        ];

        // Get assemblies
        $assemblies = $this->assemblyModel->where('machine_id', $machineId)->findAll();
        foreach ($assemblies as $assembly) {
            $mappings[] = [
                'node_type' => 'assembly',
                'node_id' => $assembly['id'],
                'label' => $assembly['name'],
                'parent_type' => 'machine',
                'parent_id' => $machineId,
                'auto_mapped' => true
            ];

            // Get parts for this assembly
            $parts = $this->partModel->where('assembly_id', $assembly['id'])->findAll();
            foreach ($parts as $part) {
                $mappings[] = [
                    'node_type' => 'part',
                    'node_id' => $part['id'],
                    'label' => $part['name'],
                    'part_code' => $part['part_number'] ?? $part['code'] ?? null,
                    'parent_type' => 'assembly',
                    'parent_id' => $assembly['id'],
                    'auto_mapped' => true
                ];
            }
        }

        return $mappings;
    }

    public function linkPartsByCode($modelId, $meshNames)
    {
        $links = [];
        
        foreach ($meshNames as $meshName) {
            // Try to find part by code/part_number matching mesh name
            $part = $this->partModel
                ->groupStart()
                    ->like('part_number', $meshName)
                    ->orLike('code', $meshName)
                    ->orLike('name', $meshName)
                ->groupEnd()
                ->first();

            if ($part) {
                $links[] = [
                    'mesh_name' => $meshName,
                    'part_id' => $part['id'],
                    'part_code' => $part['part_number'] ?? $part['code'],
                    'part_name' => $part['name'],
                    'confidence' => $this->calculateMatchConfidence($meshName, $part)
                ];

                // Update part geometry
                $this->geometryModel->where('part_id', $part['id'])
                    ->set('mesh_name', $meshName)
                    ->update();
            }
        }

        return $links;
    }

    public function createMappingOverride($modelId, $nodeType, $nodeId, $meshName = null, $coordinates = null)
    {
        $data = [
            'model_id' => $modelId,
            'node_type' => $nodeType,
            'node_id' => $nodeId,
            'label' => $this->getNodeLabel($nodeType, $nodeId),
            'metadata_json' => json_encode([
                'user_override' => true,
                'mesh_name' => $meshName,
                'override_date' => date('Y-m-d H:i:s')
            ])
        ];

        if ($coordinates) {
            $data['x'] = $coordinates['x'];
            $data['y'] = $coordinates['y'];
            $data['z'] = $coordinates['z'] ?? 0;
        }

        return $this->hotspotModel->insert($data);
    }

    public function getMachineHierarchy($machineId)
    {
        $hierarchy = [];
        
        $machine = $this->machineModel->find($machineId);
        if (!$machine) return $hierarchy;

        $hierarchy = [
            'id' => $machine['id'],
            'name' => $machine['name'],
            'type' => 'machine',
            'children' => []
        ];

        $assemblies = $this->assemblyModel->where('machine_id', $machineId)->findAll();
        foreach ($assemblies as $assembly) {
            $assemblyNode = [
                'id' => $assembly['id'],
                'name' => $assembly['name'],
                'type' => 'assembly',
                'parent_id' => $machineId,
                'children' => []
            ];

            $parts = $this->partModel->where('assembly_id', $assembly['id'])->findAll();
            foreach ($parts as $part) {
                $assemblyNode['children'][] = [
                    'id' => $part['id'],
                    'name' => $part['name'],
                    'type' => 'part',
                    'code' => $part['part_number'] ?? $part['code'],
                    'parent_id' => $assembly['id']
                ];
            }

            $hierarchy['children'][] = $assemblyNode;
        }

        return $hierarchy;
    }

    protected function calculateMatchConfidence($meshName, $part)
    {
        $confidence = 0;
        
        // Exact match on part number
        if (isset($part['part_number']) && strtolower($part['part_number']) === strtolower($meshName)) {
            $confidence = 100;
        }
        // Exact match on code
        elseif (isset($part['code']) && strtolower($part['code']) === strtolower($meshName)) {
            $confidence = 95;
        }
        // Partial match on name
        elseif (stripos($part['name'], $meshName) !== false || stripos($meshName, $part['name']) !== false) {
            $confidence = 70;
        }
        // Contains match
        else {
            $confidence = 50;
        }

        return $confidence;
    }

    protected function getNodeLabel($nodeType, $nodeId)
    {
        switch ($nodeType) {
            case 'machine':
                $node = $this->machineModel->find($nodeId);
                break;
            case 'assembly':
                $node = $this->assemblyModel->find($nodeId);
                break;
            case 'part':
                $node = $this->partModel->find($nodeId);
                break;
            default:
                return 'Unknown';
        }

        return $node ? $node['name'] : 'Unknown';
    }
}