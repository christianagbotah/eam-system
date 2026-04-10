<?php
namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class ERPMappingController extends ResourceController
{
    public function index()
    {
        $db = \Config\Database::connect();
        $mappings = $db->table('erp_field_mappings')
            ->where('is_active', 1)
            ->get()->getResultArray();
        
        return $this->respond(['data' => $mappings]);
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        
        $db = \Config\Database::connect();
        $db->table('erp_field_mappings')->where('id', $id)->update([
            'erp_field' => $data['erp_field'],
            'updated_at' => date('Y-m-d H:i:s')
        ]);
        
        return $this->respond(['status' => 'success', 'message' => 'Mapping updated']);
    }

    public function getMapping($entityType = null)
    {
        $db = \Config\Database::connect();
        $mappings = $db->table('erp_field_mappings')
            ->where('entity_type', $entityType)
            ->where('is_active', 1)
            ->get()->getResultArray();
        
        $map = [];
        foreach ($mappings as $mapping) {
            $map[$mapping['eam_field']] = $mapping['erp_field'];
        }
        
        return $this->respond(['data' => $map]);
    }
}
