<?php
namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class SystemSettingsController extends ResourceController
{
    protected $format = 'json';

    public function theme()
    {
        return $this->respond([
            'status' => 'success',
            'data' => [
                'theme' => 'light',
                'primaryColor' => '#3B82F6',
                'secondaryColor' => '#6366F1'
            ]
        ]);
    }

    public function company()
    {
        return $this->respond([
            'status' => 'success',
            'data' => [
                'name' => 'iFactory EAM',
                'logo' => null,
                'timezone' => 'UTC',
                'currency' => 'USD'
            ]
        ]);
    }

    public function index()
    {
        $db = \Config\Database::connect();
        $settings = $db->table('system_settings')->get()->getResultArray();
        
        $grouped = [];
        foreach ($settings as $setting) {
            $grouped[$setting['category']][$setting['setting_key']] = $setting['setting_value'];
        }
        
        return $this->respond(['status' => 'success', 'data' => $grouped]);
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        foreach ($data as $category => $settings) {
            foreach ($settings as $key => $value) {
                $db->table('system_settings')
                    ->where('setting_key', $key)
                    ->update([
                        'setting_value' => $value,
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
            }
        }
        
        return $this->respond(['status' => 'success', 'message' => 'Settings updated successfully']);
    }
}
