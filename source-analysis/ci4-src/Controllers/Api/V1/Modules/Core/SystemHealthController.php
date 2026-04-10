<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class HealthController extends ResourceController
{
    protected $format = 'json';
    
    public function index()
    {
        try {
            $db = \Config\Database::connect();
            $dbStatus = $db->connID ? 'connected' : 'disconnected';
        } catch (\Exception $e) {
            $dbStatus = 'error';
        }
        
        $health = [
            'status' => 'healthy',
            'timestamp' => date('Y-m-d H:i:s'),
            'database' => $dbStatus,
            'version' => '1.0.0',
            'message' => 'EAM API is operational'
        ];
        
        return $this->respond($health);
    }
}
