<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseResourceController;

class BillOfMaterialsController extends BaseResourceController
{
    protected $modelName = 'App\Models\BillOfMaterialsModel';
    protected $format = 'json';

    public function index()
    {
        $assetId = $this->request->getGet('asset_id');
        $query = $this->model;
        if ($assetId) {
            $query = $query->where('asset_id', $assetId);
        }
        $boms = $query->findAll();
        return $this->respond(['status' => 'success', 'data' => $boms]);
    }

    public function show($id = null)
    {
        $bom = $this->model->find($id);
        if (!$bom) {
            return $this->failNotFound('BOM not found');
        }
        
        // Get BOM entries
        $db = \Config\Database::connect();
        $entries = $db->table('bom_entries')->where('bom_id', $id)->get()->getResultArray();
        $bom['entries'] = $entries;
        
        return $this->respond(['status' => 'success', 'data' => $bom]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        if ($this->model->insert($data)) {
            return $this->respondCreated(['status' => 'success', 'data' => ['id' => $this->model->getInsertID()]]);
        }
        return $this->fail($this->model->errors());
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        if ($this->model->update($id, $data)) {
            return $this->respond(['status' => 'success', 'message' => 'BOM updated']);
        }
        return $this->fail($this->model->errors());
    }

    public function delete($id = null)
    {
        if ($this->model->delete($id)) {
            return $this->respondDeleted(['status' => 'success', 'message' => 'BOM deleted']);
        }
        return $this->fail('Failed to delete BOM');
    }

    public function explode($id = null)
    {
        // BOM explosion - get all components recursively
        $db = \Config\Database::connect();
        $explosion = $this->explodeBOM($id);
        return $this->respond(['status' => 'success', 'data' => $explosion]);
    }

    private function explodeBOM($bomId, $level = 0)
    {
        $db = \Config\Database::connect();
        $entries = $db->table('bom_entries')->where('bom_id', $bomId)->get()->getResultArray();
        
        $result = [];
        foreach ($entries as $entry) {
            $entry['level'] = $level;
            if ($entry['child_bom_id']) {
                $entry['children'] = $this->explodeBOM($entry['child_bom_id'], $level + 1);
            }
            $result[] = $entry;
        }
        return $result;
    }
}
