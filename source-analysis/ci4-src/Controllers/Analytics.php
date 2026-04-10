<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\EquipmentModel;
use App\Models\MaintenanceLogModel;
use App\Models\WorkOrderModel;

class Analytics extends BaseController
{
    protected $equipmentModel;
    protected $maintenanceModel;
    protected $workOrderModel;

    public function __construct()
    {
        $this->equipmentModel = new EquipmentModel();
        $this->maintenanceModel = new MaintenanceLogModel();
        $this->workOrderModel = new WorkOrderModel();
        
        helper(['form', 'url']);
        
        if (!session()->get('isLoggedIn')) {
            return redirect()->to('/auth/login');
        }
    }

    public function index()
    {
        $data = [
            'title' => 'Analytics Dashboard',
            'equipment_stats' => $this->equipmentModel->getEquipmentStats(),
            'maintenance_stats' => $this->maintenanceModel->getMaintenanceStats(),
            'work_order_stats' => $this->workOrderModel->getWorkOrderStats(),
            'controller' => 'analytics'
        ];

        return view('analytics/index', $data);
    }
}