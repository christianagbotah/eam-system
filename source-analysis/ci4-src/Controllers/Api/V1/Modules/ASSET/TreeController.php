<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\MachineModel;
use App\Models\AssemblyModel;
use App\Models\PartModel;
use CodeIgniter\HTTP\ResponseInterface;

class TreeController extends BaseApiController
{
    public function show($machineId)
    {
        try {
            $machineModel = new MachineModel();
            $assemblyModel = new AssemblyModel();
            $partModel = new PartModel();

            // Get machine
            $machine = $machineModel->find($machineId);
            if (!$machine) {
                return $this->failNotFound('Machine not found');
            }

            // Get assemblies
            $assemblies = $assemblyModel->where('equipment_id', $machineId)->findAll();
            
            // Get parts for each assembly
            foreach ($assemblies as &$assembly) {
                $assembly['parts'] = $partModel->where('component_id', $assembly['id'])->findAll();
                
                // Get sub-parts for each part
                foreach ($assembly['parts'] as &$part) {
                    $part['sub_parts'] = $partModel->where('parent_part_id', $part['id'])->findAll();
                }
            }

            $tree = [
                'machine' => $machine,
                'assemblies' => $assemblies
            ];

            return $this->respond([
                'success' => true,
                'data' => $tree
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch asset tree: ' . $e->getMessage());
        }
    }
}
