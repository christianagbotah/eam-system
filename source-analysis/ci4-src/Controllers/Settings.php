<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\SettingModel;

class Settings extends BaseController
{
    protected $settingModel;

    public function __construct()
    {
        $this->settingModel = new SettingModel();
        helper(['form', 'url']);
        
        if (!session()->get('isLoggedIn')) {
            return redirect()->to('/auth/login');
        }
    }

    public function index()
    {
        $data = [
            'title' => 'System Settings',
            'controller' => 'settings',
            'production_unit' => $this->settingModel->getSetting('production_unit', 'Yards')
        ];

        return view('settings/index', $data);
    }

    public function save()
    {
        $productionUnit = $this->request->getPost('production_unit');
        
        if ($productionUnit) {
            $this->settingModel->setSetting('production_unit', $productionUnit);
            return redirect()->to('/settings')->with('success', 'Settings saved successfully');
        }
        
        return redirect()->back()->with('error', 'Invalid data');
    }
}