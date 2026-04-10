<?php

namespace App\Controllers\Api\V1\Modules\MPMP;

use App\Controllers\Api\V1\BaseResourceController;

class ModelBatchController extends BaseResourceController
{
    protected $format = 'json';

    public function uploadBatch()
    {
        $files = $this->request->getFiles();
        $machineId = $this->request->getPost('machine_id');
        $results = ['success' => [], 'failed' => []];

        foreach ($files['models'] as $file) {
            if ($file->isValid() && !$file->hasMoved()) {
                $ext = $file->getExtension();
                if (!in_array($ext, ['glb', 'gltf', 'obj', 'fbx', 'stl'])) {
                    $results['failed'][] = ['file' => $file->getName(), 'error' => 'Invalid format'];
                    continue;
                }

                $newName = $file->getRandomName();
                $file->move(WRITEPATH . 'uploads/3d_models', $newName);

                $model = new \App\Models\ThreeDModelModel();
                $data = [
                    'name' => pathinfo($file->getName(), PATHINFO_FILENAME),
                    'file_path' => 'writable/uploads/3d_models/' . $newName,
                    'file_size' => $file->getSize(),
                    'format' => $ext,
                    'machine_id' => $machineId,
                    'status' => 'active',
                    'uploaded_by' => $this->request->user_id
                ];

                if ($model->insert($data)) {
                    $results['success'][] = ['file' => $file->getName(), 'id' => $model->getInsertID()];
                } else {
                    $results['failed'][] = ['file' => $file->getName(), 'error' => 'Database error'];
                }
            }
        }

        return $this->respond($results);
    }

    public function cloneModel($id)
    {
        $modelModel = new \App\Models\ThreeDModelModel();
        $original = $modelModel->find($id);

        if (!$original) {
            return $this->failNotFound('Model not found');
        }

        $newData = $original;
        unset($newData['id']);
        $newData['name'] = $original['name'] . ' (Copy)';
        $newData['created_at'] = date('Y-m-d H:i:s');
        $newData['uploaded_by'] = $this->request->user_id;

        if ($modelModel->insert($newData)) {
            $newId = $modelModel->getInsertID();
            
            // Clone mappings
            $db = \Config\Database::connect();
            $mappings = $db->table('3d_model_mappings')->where('model_id', $id)->get()->getResultArray();
            
            foreach ($mappings as $mapping) {
                unset($mapping['id']);
                $mapping['model_id'] = $newId;
                $db->table('3d_model_mappings')->insert($mapping);
            }

            return $this->respondCreated(['id' => $newId, 'message' => 'Model cloned successfully']);
        }

        return $this->fail('Failed to clone model');
    }

    public function exportMappings($id)
    {
        $db = \Config\Database::connect();
        $mappings = $db->table('3d_model_mappings')->where('model_id', $id)->get()->getResultArray();
        
        return $this->respond([
            'model_id' => $id,
            'mappings' => $mappings,
            'exported_at' => date('Y-m-d H:i:s')
        ]);
    }

    public function importMappings($id)
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $db->table('3d_model_mappings')->where('model_id', $id)->delete();
        
        $imported = 0;
        foreach ($data['mappings'] as $mapping) {
            unset($mapping['id']);
            $mapping['model_id'] = $id;
            if ($db->table('3d_model_mappings')->insert($mapping)) {
                $imported++;
            }
        }

        return $this->respond(['imported' => $imported, 'message' => 'Mappings imported successfully']);
    }
}
