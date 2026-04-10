<?php

namespace App\Controllers\Api\V1\Modules\MOBILE;

use App\Controllers\Api\V1\BaseApiController;

class MobileController extends BaseApiController
{
    public function index()
    {
        return $this->respond([
            'status' => 'success',
            'message' => 'Mobile API v1.0',
            'features' => [
                'work_orders',
                'assets',
                'notifications',
                'offline_sync'
            ]
        ]);
    }
    
    public function sync()
    {
        $data = $this->request->getJSON(true);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Data synced successfully',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    public function workOrders()
    {
        $plantIds = $this->getPlantIds();
        $db = \Config\Database::connect();
        
        $workOrders = $db->table('work_orders')
            ->whereIn('plant_id', $plantIds)
            ->whereIn('status', ['assigned', 'in_progress'])
            ->limit(50)
            ->get()
            ->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $workOrders
        ]);
    }
}
