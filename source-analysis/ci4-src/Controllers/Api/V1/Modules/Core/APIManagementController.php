<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class APIManagementController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        $keys = $db->table('api_keys')->where('user_id', 1)->where('is_active', true)->get()->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $keys]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $apiKey = bin2hex(random_bytes(32));
        
        $db->table('api_keys')->insert([
            'user_id' => 1,
            'api_key' => $apiKey,
            'name' => $data['name'],
            'permissions' => json_encode($data['permissions'] ?? []),
            'expires_at' => $data['expires_at'] ?? null,
            'is_active' => true
        ]);
        
        return $this->respondCreated([
            'status' => 'success',
            'message' => 'API key created',
            'api_key' => $apiKey
        ]);
    }

    public function revoke($id = null)
    {
        $db = \Config\Database::connect();
        $db->table('api_keys')->update(['is_active' => false], ['id' => $id]);
        
        return $this->respond(['status' => 'success', 'message' => 'API key revoked']);
    }
}
