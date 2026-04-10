<?php

namespace App\Controllers;

use App\Models\EquipmentModel;
use App\Models\MaintenanceLogModel;
use App\Models\WorkOrderModel;
use App\Models\UserModel;

class Admin extends BaseController
{   
    protected $equipmentModel;
    protected $maintenanceModel;
    protected $workOrderModel;
    protected $userModel;

    function __construct() {
        $this->equipmentModel = new EquipmentModel();
        $this->maintenanceModel = new MaintenanceLogModel();
        $this->workOrderModel = new WorkOrderModel();
        $this->userModel = new UserModel();
        
        helper(['form', 'url']);
        
        // Check authentication
        if (!session()->get('isLoggedIn')) {
            return redirect()->to('/auth/login');
        }
    }

    public function index(): string
    {   

        return view('backend/users/admin/editor');
    }

    /*Generate 3D model*/
    public function generate3d(): string
    {   

        return view('backend/users/admin/generate_3d_model4');
    }

    /*Dashboard*/
    public function dashboard(): string
    {   
        $data = [
            'title' => 'Admin Dashboard - Factory Manager',
            'equipment_stats' => $this->equipmentModel->getEquipmentStats(),
            'maintenance_stats' => $this->maintenanceModel->getMaintenanceStats(),
            'work_order_stats' => $this->workOrderModel->getWorkOrderStats(),
            'recent_equipment' => $this->equipmentModel->orderBy('created_at', 'DESC')->limit(5)->find(),
            'upcoming_maintenance' => $this->maintenanceModel->getUpcomingMaintenance(7),
            'controller' => 'admin'
        ];

        return view('admin/dashboard', $data);
    }

}
