<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\MaintenanceLogModel;
use App\Models\WorkOrderModel;
use App\Models\EquipmentModel;
use App\Models\UserModel;
use App\Models\PartsModel;

class Maintenance extends BaseController
{
    protected $maintenanceModel;
    protected $workOrderModel;
    protected $equipmentModel;
    protected $userModel;
    protected $partsModel;

    public function __construct()
    {
        $this->maintenanceModel = new MaintenanceLogModel();
        $this->workOrderModel = new WorkOrderModel();
        $this->equipmentModel = new EquipmentModel();
        $this->userModel = new UserModel();
        $this->partsModel = new PartsModel();
        
        helper(['form', 'url']);
        
        // Check authentication
        if (!session()->get('isLoggedIn')) {
            return redirect()->to('/auth/login');
        }
    }

    public function index()
    {
        $data = [
            'title' => 'Maintenance Dashboard',
            'maintenance_stats' => $this->maintenanceModel->getMaintenanceStats(),
            'work_order_stats' => $this->workOrderModel->getWorkOrderStats(),
            'upcoming_maintenance' => $this->maintenanceModel->getUpcomingMaintenance(7),
            'overdue_maintenance' => $this->maintenanceModel->getOverdueMaintenance(),
            'recent_work_orders' => $this->workOrderModel->getWorkOrdersWithDetails(),
            'controller' => 'maintenance'
        ];

        return view('maintenance/dashboard', $data);
    }

    public function schedule()
    {
        $data = [
            'title' => 'Maintenance Schedule',
            'maintenance_logs' => $this->maintenanceModel->getMaintenanceWithDetails(),
            'equipment' => $this->equipmentModel->findAll(),
            'technicians' => $this->userModel->getUsersByRole('technician'),
            'controller' => 'maintenance'
        ];

        return view('maintenance/schedule', $data);
    }

    public function createSchedule()
    {
        if ($this->request->getMethod() === 'POST') {
            return $this->storeSchedule();
        }

        $data = [
            'title' => 'Schedule Maintenance',
            'equipment' => $this->equipmentModel->getEquipmentWithCategory(),
            'technicians' => $this->userModel->getUsersByRole('technician'),
            'controller' => 'maintenance'
        ];

        return view('maintenance/create_schedule', $data);
    }

    public function storeSchedule()
    {
        $rules = [
            'equipment_id' => 'required|is_natural_no_zero',
            'maintenance_type' => 'required|in_list[preventive,corrective,emergency,inspection]',
            'scheduled_date' => 'required|valid_date',
            'priority' => 'required|in_list[low,medium,high,critical]',
            'description' => 'required|min_length[10]'
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $maintenanceData = [
            'equipment_id' => $this->request->getPost('equipment_id'),
            'maintenance_type' => $this->request->getPost('maintenance_type'),
            'scheduled_date' => $this->request->getPost('scheduled_date'),
            'technician_id' => $this->request->getPost('technician_id'),
            'priority' => $this->request->getPost('priority'),
            'description' => $this->request->getPost('description'),
            'status' => 'scheduled'
        ];

        if ($this->maintenanceModel->insert($maintenanceData)) {
            session()->setFlashdata('success', 'Maintenance scheduled successfully!');
            return redirect()->to('/maintenance/schedule');
        } else {
            session()->setFlashdata('error', 'Failed to schedule maintenance. Please try again.');
            return redirect()->back()->withInput();
        }
    }

    public function workOrders()
    {
        $data = [
            'title' => 'Work Orders',
            'work_orders' => $this->workOrderModel->getWorkOrdersWithDetails(),
            'controller' => 'maintenance'
        ];

        return view('maintenance/work_orders', $data);
    }

    public function createWorkOrder()
    {
        if ($this->request->getMethod() === 'POST') {
            return $this->storeWorkOrder();
        }

        $data = [
            'title' => 'Create Work Order',
            'equipment' => $this->equipmentModel->getEquipmentWithCategory(),
            'technicians' => $this->userModel->getUsersByRole('technician'),
            'controller' => 'maintenance'
        ];

        return view('maintenance/create_work_order', $data);
    }

    public function storeWorkOrder()
    {
        $rules = [
            'equipment_id' => 'required|is_natural_no_zero',
            'title' => 'required|min_length[5]|max_length[200]',
            'description' => 'required|min_length[10]',
            'priority' => 'required|in_list[low,medium,high,critical]'
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $workOrderData = [
            'equipment_id' => $this->request->getPost('equipment_id'),
            'title' => $this->request->getPost('title'),
            'description' => $this->request->getPost('description'),
            'priority' => $this->request->getPost('priority'),
            'assigned_to' => $this->request->getPost('assigned_to'),
            'requested_by' => session()->get('user_id'),
            'due_date' => $this->request->getPost('due_date'),
            'estimated_hours' => $this->request->getPost('estimated_hours'),
            'status' => $this->request->getPost('assigned_to') ? 'assigned' : 'open'
        ];

        if ($this->workOrderModel->insert($workOrderData)) {
            session()->setFlashdata('success', 'Work order created successfully!');
            return redirect()->to('/maintenance/work-orders');
        } else {
            session()->setFlashdata('error', 'Failed to create work order. Please try again.');
            return redirect()->back()->withInput();
        }
    }

    public function completeMaintenance($id)
    {
        $maintenance = $this->maintenanceModel->find($id);
        
        if (!$maintenance) {
            throw new \CodeIgniter\Exceptions\PageNotFoundException('Maintenance record not found');
        }

        if ($this->request->getMethod() === 'POST') {
            return $this->storeMaintenanceCompletion($id);
        }

        $data = [
            'title' => 'Complete Maintenance',
            'maintenance' => $this->maintenanceModel->getMaintenanceWithDetails($id),
            'parts' => $this->partsModel->findAll(),
            'controller' => 'maintenance'
        ];

        return view('maintenance/complete_maintenance', $data);
    }

    public function storeMaintenanceCompletion($id)
    {
        $rules = [
            'work_performed' => 'required|min_length[10]',
            'labor_hours' => 'permit_empty|decimal',
            'cost' => 'permit_empty|decimal'
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $completionData = [
            'status' => 'completed',
            'completed_date' => date('Y-m-d H:i:s'),
            'work_performed' => $this->request->getPost('work_performed'),
            'labor_hours' => $this->request->getPost('labor_hours'),
            'cost' => $this->request->getPost('cost'),
            'notes' => $this->request->getPost('notes'),
            'next_maintenance_date' => $this->request->getPost('next_maintenance_date')
        ];

        // Handle parts used
        $partsUsed = $this->request->getPost('parts_used');
        if ($partsUsed) {
            $completionData['parts_used'] = json_encode($partsUsed);
        }

        if ($this->maintenanceModel->update($id, $completionData)) {
            // Update equipment's last maintenance date
            $maintenance = $this->maintenanceModel->find($id);
            $this->equipmentModel->update($maintenance['equipment_id'], [
                'last_maintenance_date' => date('Y-m-d'),
                'next_maintenance_date' => $this->request->getPost('next_maintenance_date')
            ]);

            session()->setFlashdata('success', 'Maintenance completed successfully!');
            return redirect()->to('/maintenance/schedule');
        } else {
            session()->setFlashdata('error', 'Failed to complete maintenance. Please try again.');
            return redirect()->back()->withInput();
        }
    }

    public function reports()
    {
        $data = [
            'title' => 'Maintenance Reports',
            'maintenance_stats' => $this->maintenanceModel->getMaintenanceStats(),
            'work_order_stats' => $this->workOrderModel->getWorkOrderStats(),
            'controller' => 'maintenance'
        ];

        return view('maintenance/reports', $data);
    }

    // AJAX Methods
    public function ajaxUpdateStatus()
    {
        $id = $this->request->getPost('id');
        $status = $this->request->getPost('status');
        $type = $this->request->getPost('type'); // 'maintenance' or 'work_order'

        if ($type === 'work_order') {
            $result = $this->workOrderModel->update($id, ['status' => $status]);
        } else {
            $result = $this->maintenanceModel->update($id, ['status' => $status]);
        }

        if ($result) {
            return $this->response->setJSON(['success' => true, 'message' => 'Status updated successfully']);
        } else {
            return $this->response->setJSON(['success' => false, 'message' => 'Failed to update status']);
        }
    }
}