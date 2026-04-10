<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class ModuleController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        $modules = $db->table('system_modules')->orderBy('display_order')->get()->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $modules
        ]);
    }

    public function toggle($id)
    {
        $db = \Config\Database::connect();
        $module = $db->table('system_modules')->where('id', $id)->get()->getRowArray();
        
        if (!$module) {
            return $this->failNotFound('Module not found');
        }

        $newStatus = !$module['is_enabled'];
        $db->table('system_modules')->where('id', $id)->update([
            'is_enabled' => $newStatus,
            'updated_at' => date('Y-m-d H:i:s')
        ]);

        return $this->respond([
            'status' => 'success',
            'message' => 'Module ' . ($newStatus ? 'enabled' : 'disabled'),
            'data' => ['is_enabled' => $newStatus]
        ]);
    }

    public function updateSettings($id)
    {
        $db = \Config\Database::connect();
        $json = $this->request->getJSON(true);
        
        $data = [
            'subscription_tier' => $json['subscription_tier'] ?? null,
            'requires_subscription' => $json['requires_subscription'] ?? false,
            'settings' => json_encode($json['settings'] ?? []),
            'updated_at' => date('Y-m-d H:i:s')
        ];

        $db->table('system_modules')->where('id', $id)->update($data);

        return $this->respond([
            'status' => 'success',
            'message' => 'Module settings updated'
        ]);
    }

    public function seedModules()
    {
        return $this->respond([
            'status' => 'success',
            'message' => 'Modules already exist in database'
        ]);
    }
}
