<?php
namespace App\Controllers\Api\V1\Modules\Core;

use App\Controllers\Api\V1\BaseApiController;

class AssetsUnifiedController extends BaseApiController {
    
    public function index() {
        $db = \Config\Database::connect();
        
        $criticality = $this->request->getGet('criticality');
        $perPage = $this->request->getGet('per_page') ?? 50;
        
        $builder = $db->table('assets_unified');
        
        // Apply plant filtering
        $plantIds = $this->getPlantIds();
        if (!empty($plantIds)) {
            $builder->whereIn('plant_id', $plantIds);
        }
        
        if ($criticality) {
            $builder->where('criticality', $criticality);
        }
        
        $assets = $builder->limit($perPage)->get()->getResultArray();
        
        return $this->respond([
            'success' => true,
            'data' => $assets,
            'total' => count($assets)
        ]);
    }
}
