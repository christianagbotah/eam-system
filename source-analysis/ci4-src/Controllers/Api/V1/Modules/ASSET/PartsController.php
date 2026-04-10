<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\PartModel;
use App\Models\PartMediaModel;
use CodeIgniter\HTTP\ResponseInterface;

class PartsController extends BaseApiController
{
    protected $partModel;
    protected $partMediaModel;

    public function __construct()
    {
        $this->partModel = new PartModel();
        $this->partMediaModel = new PartMediaModel();
    }

    public function index()
    {
        try {
            $componentId = $this->request->getGet('component_id');
            $assemblyId = $this->request->getGet('assembly_id'); // Frontend compatibility
            
            $query = $this->partModel->select('*');
                
            if ($componentId || $assemblyId) {
                $query->where('component_id', $componentId ?: $assemblyId);
            }
            
            $parts = $query->findAll();

            // Map database fields to frontend expected fields
            foreach ($parts as &$part) {
                $part['assembly_id'] = $part['component_id'];
            }

            return $this->respond([
                'success' => true,
                'data' => $parts
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch parts: ' . $e->getMessage());
        }
    }

    public function show($id = null)
    {
        try {
            $part = $this->partModel->find($id);

            if (!$part) {
                return $this->failNotFound('Part not found');
            }

            // Map database fields to frontend expected fields
            $part['assembly_id'] = $part['component_id'];

            return $this->respond([
                'success' => true,
                'data' => $part
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch part: ' . $e->getMessage());
        }
    }

    public function create($assemblyId = null)
    {
        $db = \Config\Database::connect();
        $db->transStart();
        
        try {
            $data = $this->request->getPost();
            
            // Map frontend fields to database fields
            if (isset($data['assembly_id'])) {
                $data['component_id'] = $data['assembly_id'];
                unset($data['assembly_id']);
            }
            
            if ($assemblyId) {
                $data['component_id'] = $assemblyId;
            }
            
            // Handle file upload
            $file = $this->request->getFile('part_image');
            if ($file && $file->isValid()) {
                $newName = $file->getRandomName();
                $file->move(WRITEPATH . 'uploads/parts/', $newName);
                $data['part_image'] = 'uploads/parts/' . $newName;
            }

            // Generate part code if not provided
            if (empty($data['part_code'])) {
                $data['part_code'] = 'PRT-' . str_pad($this->partModel->countAll() + 1, 4, '0', STR_PAD_LEFT);
            }

            $id = $this->partModel->insert($data);
            
            if (!$id) {
                $db->transRollback();
                return $this->failValidationErrors($this->partModel->errors());
            }

            // Sync to assets_unified
            $db->table('assets_unified')->insert([
                'asset_name' => $data['part_name'],
                'asset_code' => $data['part_code'],
                'asset_type' => 'part',
                'parent_id' => null,
                'status' => $data['status'] ?? 'active',
                'asset_id' => $id
            ]);

            $db->transComplete();

            $part = $this->partModel->find($id);
            if ($part) {
                $part['assembly_id'] = $part['component_id'];
            }
            
            return $this->respondCreated([
                'success' => true,
                'data' => $part,
                'message' => 'Part created successfully'
            ]);
        } catch (\Exception $e) {
            $db->transRollback();
            return $this->failServerError('Failed to create part: ' . $e->getMessage());
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        
        try {
            $part = $this->partModel->find($id);
            if (!$part) {
                return $this->failNotFound('Part not found');
            }

            $data = $this->request->getRawInput();
            
            // Map frontend fields to database fields
            if (isset($data['assembly_id'])) {
                $data['component_id'] = $data['assembly_id'];
                unset($data['assembly_id']);
            }
            
            // Handle file upload
            $file = $this->request->getFile('part_image');
            if ($file && $file->isValid()) {
                $newName = $file->getRandomName();
                $file->move(WRITEPATH . 'uploads/parts/', $newName);
                $data['part_image'] = 'uploads/parts/' . $newName;
            }

            $updated = $this->partModel->update($id, $data);
            
            if (!$updated) {
                return $this->failValidationErrors($this->partModel->errors());
            }

            // Update assets_unified
            $unifiedAsset = $db->table('assets_unified')->where('asset_id', $id)->where('asset_type', 'part')->get()->getRowArray();
            if ($unifiedAsset) {
                $db->table('assets_unified')->where('id', $unifiedAsset['id'])->update([
                    'asset_name' => $data['part_name'] ?? $unifiedAsset['asset_name'],
                    'asset_code' => $data['part_code'] ?? $unifiedAsset['asset_code'],
                    'status' => $data['status'] ?? $unifiedAsset['status']
                ]);
            }

            $part = $this->partModel->find($id);
            if ($part) {
                $part['assembly_id'] = $part['component_id'];
            }
            
            return $this->respond([
                'success' => true,
                'data' => $part,
                'message' => 'Part updated successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to update part: ' . $e->getMessage());
        }
    }

    public function delete($id = null)
    {
        try {
            $part = $this->partModel->find($id);
            if (!$part) {
                return $this->failNotFound('Part not found');
            }

            $this->partModel->delete($id);
            
            return $this->respond([
                'success' => true,
                'message' => 'Part deleted successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to delete part: ' . $e->getMessage());
        }
    }

    public function uploadMedia($partId)
    {
        try {
            $part = $this->partModel->find($partId);
            if (!$part) {
                return $this->failNotFound('Part not found');
            }

            $file = $this->request->getFile('file');
            $type = $this->request->getPost('type') ?? 'image';

            if (!$file || !$file->isValid()) {
                return $this->failValidationError('Invalid file');
            }

            $newName = $file->getRandomName();
            $uploadPath = WRITEPATH . 'uploads/parts/media/';
            
            if (!is_dir($uploadPath)) {
                mkdir($uploadPath, 0755, true);
            }
            
            $file->move($uploadPath, $newName);

            $mediaData = [
                'part_id' => $partId,
                'media_type' => $type,
                'file_path' => 'uploads/parts/media/' . $newName
            ];

            $mediaId = $this->partMediaModel->insert($mediaData);
            $media = $this->partMediaModel->find($mediaId);

            return $this->respondCreated([
                'success' => true,
                'data' => $media,
                'message' => 'Media uploaded successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to upload media: ' . $e->getMessage());
        }
    }

    public function getMedia($partId)
    {
        try {
            $media = $this->partMediaModel->where('part_id', $partId)->findAll();

            return $this->respond([
                'success' => true,
                'data' => $media
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch media: ' . $e->getMessage());
        }
    }

    public function bom($partId)
    {
        try {
            $bomModel = new \App\Models\BomEntryModel();
            $bomEntries = $bomModel->where('part_id', $partId)->findAll();

            return $this->respond([
                'success' => true,
                'data' => $bomEntries
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch BOM: ' . $e->getMessage());
        }
    }
}
