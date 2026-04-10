<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\MaintenanceOrderModel;
use CodeIgniter\HTTP\ResponseInterface;

class MaintenanceOrderController extends BaseController
{
    protected $maintenanceOrderModel;

    public function __construct()
    {
        $this->maintenanceOrderModel = new MaintenanceOrderModel();
    }

    // List all maintenance orders with filters
    public function index()
    {
        $filters = [
            'status' => $this->request->getGet('status'),
            'priority' => $this->request->getGet('priority'),
            'order_type' => $this->request->getGet('order_type'),
            'asset_id' => $this->request->getGet('asset_id'),
            'assigned_to' => $this->request->getGet('assigned_to'),
            'date_from' => $this->request->getGet('date_from'),
            'date_to' => $this->request->getGet('date_to')
        ];

        $orders = $this->maintenanceOrderModel->getOrdersWithDetails($filters);

        return $this->response->setJSON([
            'status' => 'success',
            'data' => $orders
        ]);
    }

    // Get single order with full details
    public function show($id)
    {
        $order = $this->maintenanceOrderModel->getOrderWithFullDetails($id);

        if (!$order) {
            return $this->response->setStatusCode(404)->setJSON([
                'status' => 'error',
                'message' => 'Maintenance order not found'
            ]);
        }

        return $this->response->setJSON([
            'status' => 'success',
            'data' => $order
        ]);
    }

    // Create new maintenance order
    public function create()
    {
        $rules = [
            'title' => 'required|max_length[255]',
            'order_type' => 'required|in_list[preventive,corrective,breakdown,inspection,modification,calibration]',
            'priority' => 'required|in_list[low,medium,high,critical,emergency]',
            'asset_id' => 'permit_empty|integer'
        ];

        if (!$this->validate($rules)) {
            return $this->response->setStatusCode(400)->setJSON([
                'status' => 'error',
                'errors' => $this->validator->getErrors()
            ]);
        }

        $data = $this->request->getJSON(true);
        $data['created_by'] = session()->get('user_id');
        $data['requested_by'] = session()->get('user_id');
        $data['requested_date'] = date('Y-m-d H:i:s');

        $orderId = $this->maintenanceOrderModel->insert($data);

        if ($orderId) {
            $this->maintenanceOrderModel->logActivity($orderId, 'created', 'Maintenance order created');
            
            return $this->response->setStatusCode(201)->setJSON([
                'status' => 'success',
                'message' => 'Maintenance order created successfully',
                'data' => ['id' => $orderId]
            ]);
        }

        return $this->response->setStatusCode(500)->setJSON([
            'status' => 'error',
            'message' => 'Failed to create maintenance order'
        ]);
    }

    // Update maintenance order
    public function update($id)
    {
        $order = $this->maintenanceOrderModel->find($id);
        if (!$order) {
            return $this->response->setStatusCode(404)->setJSON([
                'status' => 'error',
                'message' => 'Maintenance order not found'
            ]);
        }

        $data = $this->request->getJSON(true);
        
        if ($this->maintenanceOrderModel->update($id, $data)) {
            $this->maintenanceOrderModel->logActivity($id, 'updated', 'Maintenance order updated');
            
            return $this->response->setJSON([
                'status' => 'success',
                'message' => 'Maintenance order updated successfully'
            ]);
        }

        return $this->response->setStatusCode(500)->setJSON([
            'status' => 'error',
            'message' => 'Failed to update maintenance order'
        ]);
    }

    // Assign order to technician/team
    public function assign($id)
    {
        $data = $this->request->getJSON(true);
        
        $updateData = [
            'assigned_to' => $data['assigned_to'] ?? null,
            'assigned_team' => $data['assigned_team'] ?? null,
            'assigned_date' => date('Y-m-d H:i:s'),
            'status' => 'assigned'
        ];

        if ($this->maintenanceOrderModel->update($id, $updateData)) {
            $this->maintenanceOrderModel->logActivity($id, 'assigned', 'Order assigned to technician/team');
            
            return $this->response->setJSON([
                'status' => 'success',
                'message' => 'Maintenance order assigned successfully'
            ]);
        }

        return $this->response->setStatusCode(500)->setJSON([
            'status' => 'error',
            'message' => 'Failed to assign maintenance order'
        ]);
    }

    // Start work on order
    public function start($id)
    {
        $updateData = [
            'actual_start' => date('Y-m-d H:i:s'),
            'status' => 'in_progress'
        ];

        if ($this->maintenanceOrderModel->update($id, $updateData)) {
            $this->maintenanceOrderModel->logActivity($id, 'started', 'Work started on order');
            
            return $this->response->setJSON([
                'status' => 'success',
                'message' => 'Work started successfully'
            ]);
        }

        return $this->response->setStatusCode(500)->setJSON([
            'status' => 'error',
            'message' => 'Failed to start work'
        ]);
    }

    // Complete maintenance order
    public function complete($id)
    {
        $data = $this->request->getJSON(true);
        
        $updateData = [
            'actual_end' => date('Y-m-d H:i:s'),
            'status' => 'completed',
            'completion_notes' => $data['completion_notes'] ?? null,
            'root_cause' => $data['root_cause'] ?? null,
            'corrective_action' => $data['corrective_action'] ?? null,
            'preventive_action' => $data['preventive_action'] ?? null,
            'actual_hours' => $data['actual_hours'] ?? null,
            'actual_cost' => $data['actual_cost'] ?? null
        ];

        if ($this->maintenanceOrderModel->update($id, $updateData)) {
            $this->maintenanceOrderModel->logActivity($id, 'completed', 'Order completed');
            
            return $this->response->setJSON([
                'status' => 'success',
                'message' => 'Maintenance order completed successfully'
            ]);
        }

        return $this->response->setStatusCode(500)->setJSON([
            'status' => 'error',
            'message' => 'Failed to complete maintenance order'
        ]);
    }

    // Dashboard statistics
    public function dashboard()
    {
        $stats = $this->maintenanceOrderModel->getDashboardStats();
        
        return $this->response->setJSON([
            'status' => 'success',
            'data' => $stats
        ]);
    }

    // Get orders by status
    public function byStatus($status)
    {
        $orders = $this->maintenanceOrderModel->where('status', $status)->findAll();
        
        return $this->response->setJSON([
            'status' => 'success',
            'data' => $orders
        ]);
    }

    // Get orders by priority
    public function byPriority($priority)
    {
        $orders = $this->maintenanceOrderModel->where('priority', $priority)->findAll();
        
        return $this->response->setJSON([
            'status' => 'success',
            'data' => $orders
        ]);
    }

    // Get overdue orders
    public function overdue()
    {
        $orders = $this->maintenanceOrderModel->getOverdueOrders();
        
        return $this->response->setJSON([
            'status' => 'success',
            'data' => $orders
        ]);
    }

    // Get upcoming scheduled orders
    public function upcoming()
    {
        $days = $this->request->getGet('days') ?? 7;
        $orders = $this->maintenanceOrderModel->getUpcomingOrders($days);
        
        return $this->response->setJSON([
            'status' => 'success',
            'data' => $orders
        ]);
    }

    // Analytics and reports
    public function analytics()
    {
        $dateFrom = $this->request->getGet('date_from');
        $dateTo = $this->request->getGet('date_to');
        
        $analytics = $this->maintenanceOrderModel->getAnalytics($dateFrom, $dateTo);
        
        return $this->response->setJSON([
            'status' => 'success',
            'data' => $analytics
        ]);
    }

    // Export orders
    public function export()
    {
        $format = $this->request->getGet('format') ?? 'csv';
        $filters = [
            'status' => $this->request->getGet('status'),
            'priority' => $this->request->getGet('priority'),
            'date_from' => $this->request->getGet('date_from'),
            'date_to' => $this->request->getGet('date_to')
        ];

        $orders = $this->maintenanceOrderModel->getOrdersWithDetails($filters);

        if ($format === 'json') {
            return $this->response->setJSON($orders);
        }

        // CSV export
        $csv = $this->maintenanceOrderModel->exportToCSV($orders);
        
        return $this->response
            ->setHeader('Content-Type', 'text/csv')
            ->setHeader('Content-Disposition', 'attachment; filename="maintenance_orders_' . date('Y-m-d') . '.csv"')
            ->setBody($csv);
    }

    // Bulk operations
    public function bulkUpdate()
    {
        $data = $this->request->getJSON(true);
        $ids = $data['ids'] ?? [];
        $updates = $data['updates'] ?? [];

        if (empty($ids) || empty($updates)) {
            return $this->response->setStatusCode(400)->setJSON([
                'status' => 'error',
                'message' => 'IDs and updates are required'
            ]);
        }

        $success = $this->maintenanceOrderModel->bulkUpdate($ids, $updates);

        return $this->response->setJSON([
            'status' => 'success',
            'message' => "Updated {$success} orders successfully"
        ]);
    }

    // Delete order
    public function delete($id)
    {
        if ($this->maintenanceOrderModel->delete($id)) {
            return $this->response->setJSON([
                'status' => 'success',
                'message' => 'Maintenance order deleted successfully'
            ]);
        }

        return $this->response->setStatusCode(500)->setJSON([
            'status' => 'error',
            'message' => 'Failed to delete maintenance order'
        ]);
    }
}
