<?php

namespace App\Controllers;

use App\Models\WorkOrderModel;
use App\Services\RWOP\WorkOrderService;

class WorkOrderController extends BaseController
{
    protected $workOrderModel;
    protected $workOrderService;

    public function __construct()
    {
        $this->workOrderModel = new WorkOrderModel();
        $this->workOrderService = new \App\Services\RWOP\WorkOrderService();
    }

    public function index()
    {
        $this->authorize('work_orders.view');

        $data = [
            'title' => 'Work Orders',
            'canCreate' => $this->can('work_orders.create'),
            'canUpdate' => $this->can('work_orders.update'),
            'canDelete' => $this->can('work_orders.delete'),
            'canAssign' => $this->can('work_orders.assign'),
            'canApprove' => $this->can('work_orders.approve'),
            'canClose' => $this->can('work_orders.close')
        ];

        return view('work_orders/index', $data);
    }

    public function create()
    {
        $this->authorize('work_orders.create');

        $data = [
            'title' => 'Create Work Order'
        ];

        return view('work_orders/create', $data);
    }

    public function store()
    {
        $this->authorize('work_orders.create');

        $validation = \Config\Services::validation();
        $validation->setRules([
            'title' => 'required|min_length[3]',
            'asset_id' => 'required|integer',
            'priority' => 'required|in_list[low,medium,high,critical]'
        ]);

        if (!$validation->withRequest($this->request)->run()) {
            return $this->validationErrorResponse($validation->getErrors());
        }

        $data = $this->request->getPost();
        $data['created_by'] = $this->userId;
        $data['status'] = 'draft';

        $workOrderId = $this->workOrderModel->insert($data);

        if ($workOrderId) {
            return $this->successResponse(
                ['work_order_id' => $workOrderId],
                'Work order created successfully'
            );
        }

        return $this->errorResponse('Failed to create work order');
    }

    public function view($id)
    {
        $this->authorize('work_orders.view');

        $workOrder = $this->workOrderModel->find($id);

        if (!$workOrder) {
            return $this->notFoundResponse('Work order not found');
        }

        $data = [
            'title' => 'Work Order Details',
            'workOrder' => $workOrder,
            'canUpdate' => $this->can('work_orders.update'),
            'canDelete' => $this->can('work_orders.delete'),
            'canAssign' => $this->can('work_orders.assign'),
            'canApprove' => $this->can('work_orders.approve'),
            'canClose' => $this->can('work_orders.close')
        ];

        return view('work_orders/view', $data);
    }

    public function update($id)
    {
        $this->authorize('work_orders.update');

        $workOrder = $this->workOrderModel->find($id);

        if (!$workOrder) {
            return $this->notFoundResponse('Work order not found');
        }

        $data = $this->request->getJSON(true);
        $data['updated_by'] = $this->userId;
        $data['updated_at'] = date('Y-m-d H:i:s');

        if ($this->workOrderModel->update($id, $data)) {
            return $this->successResponse(null, 'Work order updated successfully');
        }

        return $this->errorResponse('Failed to update work order');
    }

    public function delete($id)
    {
        $this->authorize('work_orders.delete');

        $workOrder = $this->workOrderModel->find($id);

        if (!$workOrder) {
            return $this->notFoundResponse('Work order not found');
        }

        if ($this->workOrderModel->delete($id)) {
            return $this->successResponse(null, 'Work order deleted successfully');
        }

        return $this->errorResponse('Failed to delete work order');
    }

    public function assign($id)
    {
        $this->authorize('work_orders.assign');

        $workOrder = $this->workOrderModel->find($id);

        if (!$workOrder) {
            return $this->notFoundResponse('Work order not found');
        }

        $technicianId = $this->request->getPost('technician_id');

        if (!$technicianId) {
            return $this->errorResponse('Technician ID is required');
        }

        $data = [
            'assigned_to' => $technicianId,
            'assigned_by' => $this->userId,
            'assigned_at' => date('Y-m-d H:i:s'),
            'status' => 'assigned'
        ];

        if ($this->workOrderModel->update($id, $data)) {
            return $this->successResponse(null, 'Work order assigned successfully');
        }

        return $this->errorResponse('Failed to assign work order');
    }

    public function approve($id)
    {
        $this->authorize('work_orders.approve');

        $workOrder = $this->workOrderModel->find($id);

        if (!$workOrder) {
            return $this->notFoundResponse('Work order not found');
        }

        $data = [
            'status' => 'approved',
            'approved_by' => $this->userId,
            'approved_at' => date('Y-m-d H:i:s')
        ];

        if ($this->workOrderModel->update($id, $data)) {
            return $this->successResponse(null, 'Work order approved successfully');
        }

        return $this->errorResponse('Failed to approve work order');
    }

    public function close($id)
    {
        $this->authorize('work_orders.close');

        $workOrder = $this->workOrderModel->find($id);

        if (!$workOrder) {
            return $this->notFoundResponse('Work order not found');
        }

        $data = [
            'status' => 'closed',
            'closed_by' => $this->userId,
            'closed_at' => date('Y-m-d H:i:s'),
            'completion_notes' => $this->request->getPost('completion_notes')
        ];

        if ($this->workOrderModel->update($id, $data)) {
            return $this->successResponse(null, 'Work order closed successfully');
        }

        return $this->errorResponse('Failed to close work order');
    }

    public function list()
    {
        $this->authorize('work_orders.view');

        $filters = [
            'status' => $this->request->getGet('status'),
            'priority' => $this->request->getGet('priority'),
            'assigned_to' => $this->request->getGet('assigned_to')
        ];

        $workOrders = $this->workOrderModel
            ->where($filters)
            ->findAll();

        return $this->successResponse($workOrders);
    }
}
