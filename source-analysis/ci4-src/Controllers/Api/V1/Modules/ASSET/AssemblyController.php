<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\AssemblyModel;

class AssemblyController extends BaseApiController
{
    protected $assemblyModel;

    public function __construct()
    {
        $this->assemblyModel = new AssemblyModel();
    }

    public function index()
    {
        $user = $this->getUserOrNull();
        $userRole = $user->role ?? 'admin'; // Temporary: default to admin for testing
        
        try {
            $machineId = $this->request->getGet('machine_id');
            
            $db = \Config\Database::connect();
            $sql = "SELECT a.*, COALESCE(COUNT(p.id), 0) as parts_count 
                    FROM assemblies a 
                    LEFT JOIN parts p ON p.component_id = a.id";
                    
            if ($machineId) {
                $sql .= " WHERE a.equipment_id = ?";
            }
            
            $sql .= " GROUP BY a.id ORDER BY a.id";
            
            if ($machineId) {
                $assemblies = $db->query($sql, [$machineId])->getResultArray();
            } else {
                $assemblies = $db->query($sql)->getResultArray();
            }
            
            return $this->respond([
                'status' => 'success',
                'data' => $assemblies
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function show($id = null)
    {
        try {
            $db = \Config\Database::connect();
            $sql = "SELECT a.*, COALESCE(COUNT(p.id), 0) as parts_count 
                    FROM assemblies a 
                    LEFT JOIN parts p ON p.component_id = a.id 
                    WHERE a.id = ? 
                    GROUP BY a.id";
            
            $assembly = $db->query($sql, [$id])->getRowArray();
            
            if (!$assembly) {
                return $this->failNotFound('Assembly not found');
            }
            
            return $this->respond([
                'status' => 'success',
                'data' => $assembly
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function create()
    {
        try {
            $validation = \Config\Services::validation();
            $validation->setRules([
                'equipment_id' => 'required|is_natural_no_zero',
                'assembly_name' => 'required|min_length[3]|max_length[255]',
                'assembly_category' => 'required',
                'criticality' => 'required|in_list[high,medium,low]',
                'assembly_image' => 'if_exist|uploaded[assembly_image]|max_size[assembly_image,2048]|is_image[assembly_image]'
            ]);

            if (!$validation->withRequest($this->request)->run()) {
                return $this->fail($validation->getErrors());
            }

            $data = $this->request->getPost();
            
            // Auto-generate assembly code if not provided
            if (empty($data['assembly_code'])) {
                $data['assembly_code'] = $this->generateAssemblyCode($data['equipment_id']);
            }

            // Handle file upload
            $file = $this->request->getFile('assembly_image');
            if ($file && $file->isValid() && !$file->hasMoved()) {
                $newName = $file->getRandomName();
                $file->move(WRITEPATH . 'uploads/assemblies', $newName);
                $data['assembly_image'] = 'uploads/assemblies/' . $newName;
            }

            $assemblyId = $this->assemblyModel->insert($data);

            // Insert into assets_unified for hierarchy
            $db = \Config\Database::connect();
            $db->table('assets_unified')->insert([
                'asset_name' => $data['assembly_name'],
                'asset_code' => $data['assembly_code'],
                'asset_type' => 'assembly',
                'parent_id' => $data['equipment_id'],
                'status' => $data['status'] ?? 'active',
                'criticality' => $data['criticality'],
                'asset_id' => $assemblyId
            ]);
            $unifiedId = $db->insertID();

            // Insert into asset_closure
            $db->table('asset_closure')->insert(['ancestor_id' => $unifiedId, 'descendant_id' => $unifiedId, 'depth' => 0]);
            $db->query("INSERT INTO asset_closure (ancestor_id, descendant_id, depth) SELECT ancestor_id, ?, depth + 1 FROM asset_closure WHERE descendant_id = ?", [$unifiedId, $data['equipment_id']]);

            // Insert into BOM if cost data provided
            if (!empty($data['unit_cost']) || !empty($data['quantity'])) {
                $db->table('bom')->insert([
                    'parent_asset_id' => $data['equipment_id'],
                    'child_asset_id' => $unifiedId,
                    'quantity' => $data['quantity'] ?? 1,
                    'unit_cost' => $data['unit_cost'] ?? 0,
                    'total_cost' => ($data['quantity'] ?? 1) * ($data['unit_cost'] ?? 0)
                ]);
            }

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Assembly created successfully',
                'data' => ['id' => $assemblyId, 'assembly_code' => $data['assembly_code']]
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function update($id = null)
    {
        try {
            $assembly = $this->assemblyModel->find($id);
            if (!$assembly) {
                return $this->failNotFound('Assembly not found');
            }

            $validation = \Config\Services::validation();
            $validation->setRules([
                'assembly_name' => 'if_exist|min_length[3]|max_length[255]',
                'assembly_image' => 'if_exist|uploaded[assembly_image]|max_size[assembly_image,2048]|is_image[assembly_image]'
            ]);

            if (!$validation->withRequest($this->request)->run()) {
                return $this->fail($validation->getErrors());
            }

            $data = $this->request->getPost();

            // Handle file upload
            $file = $this->request->getFile('assembly_image');
            if ($file && $file->isValid() && !$file->hasMoved()) {
                $newName = $file->getRandomName();
                $file->move(WRITEPATH . 'uploads/assemblies', $newName);
                $data['assembly_image'] = 'uploads/assemblies/' . $newName;
            }

            $this->assemblyModel->update($id, $data);

            // Update assets_unified
            $db = \Config\Database::connect();
            $unifiedAsset = $db->table('assets_unified')->where('asset_id', $id)->where('asset_type', 'assembly')->get()->getRowArray();
            if ($unifiedAsset) {
                $updateData = [
                    'asset_name' => $data['assembly_name'] ?? $unifiedAsset['asset_name'],
                    'asset_code' => $data['assembly_code'] ?? $unifiedAsset['asset_code'],
                    'status' => $data['status'] ?? $unifiedAsset['status'],
                    'criticality' => $data['criticality'] ?? $unifiedAsset['criticality']
                ];
                
                // Check if parent changed
                if (isset($data['equipment_id']) && $data['equipment_id'] != $unifiedAsset['parent_id']) {
                    $updateData['parent_id'] = $data['equipment_id'];
                    
                    // Rebuild asset_closure for this asset
                    $db->table('asset_closure')->where('descendant_id', $unifiedAsset['id'])->where('ancestor_id !=', $unifiedAsset['id'])->delete();
                    $db->query("INSERT INTO asset_closure (ancestor_id, descendant_id, depth) SELECT ancestor_id, ?, depth + 1 FROM asset_closure WHERE descendant_id = ?", [$unifiedAsset['id'], $data['equipment_id']]);
                }
                
                $db->table('assets_unified')->where('id', $unifiedAsset['id'])->update($updateData);
            }

            // Update BOM if cost/quantity changed
            if (isset($data['unit_cost']) || isset($data['quantity'])) {
                $bom = $db->table('bom')->where('child_asset_id', $unifiedAsset['id'])->get()->getRowArray();
                if ($bom) {
                    $db->table('bom')->where('id', $bom['id'])->update([
                        'quantity' => $data['quantity'] ?? $bom['quantity'],
                        'unit_cost' => $data['unit_cost'] ?? $bom['unit_cost'],
                        'total_cost' => ($data['quantity'] ?? $bom['quantity']) * ($data['unit_cost'] ?? $bom['unit_cost'])
                    ]);
                }
            }

            return $this->respond([
                'status' => 'success',
                'message' => 'Assembly updated successfully'
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function delete($id = null)
    {
        try {
            $assembly = $this->assemblyModel->find($id);
            if (!$assembly) {
                return $this->failNotFound('Assembly not found');
            }

            $this->assemblyModel->delete($id);

            return $this->respondDeleted([
                'status' => 'success',
                'message' => 'Assembly deleted successfully'
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    private function generateAssemblyCode($equipmentId)
    {
        $lastAssembly = $this->assemblyModel
            ->where('equipment_id', $equipmentId)
            ->orderBy('id', 'DESC')
            ->first();
        
        $lastNum = $lastAssembly ? (int)substr($lastAssembly['assembly_code'], -4) : 0;
        return 'ASM-' . str_pad($lastNum + 1, 4, '0', STR_PAD_LEFT);
    }
}
