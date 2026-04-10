<?php

namespace App\Controllers\Api\V1\Modules\Core;

use App\Controllers\Api\V1\BaseApiController;

class PlantTestController extends BaseApiController
{
    public function testPlantFilter()
    {
        $plantIds = $this->getPlantIds();
        $plantId = $this->getPlantId();
        $allAccessible = $this->getAllAccessiblePlantIds();
        
        $request = \Config\Services::request();
        $headerPlantId = $request->getHeaderLine('X-Plant-ID');
        $sessionPlantId = session()->get('default_plant_id');
        
        $userData = \App\Filters\JWTAuthFilter::getUserData();
        
        // Test query
        $db = \Config\Database::connect();
        $query = $db->table('assets_unified');
        $this->applyPlantScope($query);
        $assets = $query->select('id, asset_name, plant_id')->limit(5)->get()->getResultArray();
        
        return $this->respond([
            'debug_info' => [
                'header_plant_id' => $headerPlantId,
                'session_plant_id' => $sessionPlantId,
                'jwt_plant_id' => $userData->plant_id ?? null,
                'jwt_plant_ids' => $userData->plant_ids ?? null,
                'active_plant_id' => $plantId,
                'filter_plant_ids' => $plantIds,
                'all_accessible_plants' => $allAccessible,
            ],
            'sample_assets' => $assets,
            'total_assets_for_plant' => $db->table('assets_unified')->whereIn('plant_id', $plantIds)->countAllResults()
        ]);
    }
}
