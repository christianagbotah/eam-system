<?php

namespace App\Controllers\Api\V1\Modules\IMS;

use App\Controllers\Api\V1\BaseApiController;

class MaterialRequisitionController extends BaseApiController
{
    protected $modelName = 'App\Models\MaterialRequisitionModel';
    protected $format = 'json';

    /**
     * Get all material requests
     */
    public function index()
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'view')) {
            return $this->failForbidden('Insufficient permissions to view material requisitions');
        }

        $status = $this->request->getGet('status');
        $userId = $this->request->getGet('user_id');

        $builder = $this->model->builder();
        $builder->select('material_requests.*, parts.part_name, parts.part_number, work_orders.title as work_order_title')
                ->join('parts', 'parts.id = material_requests.part_id')
                ->join('work_orders', 'work_orders.id = material_requests.work_order_id');

        if ($status) {
            $builder->where('material_requests.status', $status);
        }

        if ($userId) {
            $builder->where('material_requests.requested_by', $userId);
        }

        $requests = $builder->orderBy('material_requests.created_at', 'DESC')->get()->getResult();

        // Audit log
        $this->auditLog('VIEW', 'material_requisitions', 0, null, ['count' => count($requests)]);

        return $this->respond([
            'status' => 'success',
            'data' => $requests
        ]);
    }

    /**
     * Create new material request
     */
    public function create()
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'create')) {
            return $this->failForbidden('Insufficient permissions to create material requisitions');
        }

        $data = $this->request->getJSON(true);
        
        $rules = [
            'work_order_id' => 'required|integer',
            'part_id' => 'required|integer',
            'quantity_requested' => 'required|integer|greater_than[0]'
        ];
        
        if (!$this->validate($rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }
        
        // Check inventory availability
        $partId = $data['part_id'];
        $quantityRequested = $data['quantity_requested'];
        
        $inventoryCheck = $this->checkInventoryAvailability($partId, $quantityRequested);
        
        $requestData = [
            'work_order_id' => $data['work_order_id'],
            'part_id' => $partId,
            'quantity_requested' => $quantityRequested,
            'quantity_issued' => 0,
            'status' => 'pending',
            'requested_by' => $data['requested_by'] ?? 'system',
            'notes' => $data['notes'] ?? '',
            'availability_status' => $inventoryCheck['available'] ? 'available' : 'unavailable',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $this->model->insert($requestData);
        $requestId = $this->model->getInsertID();

        // Audit log
        $this->auditLog('CREATE', 'material_requisitions', $requestId, null, $requestData);

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Material request created successfully',
            'data' => array_merge($requestData, ['id' => $requestId]),
            'inventory_check' => $inventoryCheck
        ]);
    }

    /**
     * Approve material request
     */
    public function approve($id = null)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'update')) {
            return $this->failForbidden('Insufficient permissions to approve material requisitions');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('material_requests', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this material request');
        }

        $request = $this->model->find($id);
        
        if (!$request) {
            return $this->failNotFound('Material request not found');
        }
        
        $data = [
            'status' => 'approved',
            'approved_by' => $this->request->getJSON()->approved_by ?? 'system',
            'approved_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $this->model->update($id, $data);

        // Audit log
        $this->auditLog('APPROVE', 'material_requisitions', $id, null, $data);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Material request approved',
            'data' => $this->model->find($id)
        ]);
    }

    /**
     * Issue materials
     */
    public function issue($id = null)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'update')) {
            return $this->failForbidden('Insufficient permissions to issue materials');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('material_requests', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this material request');
        }

        $request = $this->model->find($id);
        
        if (!$request) {
            return $this->failNotFound('Material request not found');
        }
        
        $jsonData = $this->request->getJSON(true);
        $quantityIssued = $jsonData['quantity_issued'] ?? $request['quantity_requested'];
        
        // Update inventory
        $this->updateInventoryStock($request['part_id'], -$quantityIssued);
        
        // Create transaction record
        $this->createInventoryTransaction([
            'part_id' => $request['part_id'],
            'work_order_id' => $request['work_order_id'],
            'quantity' => $quantityIssued,
            'transaction_type' => 'issue',
            'reference_id' => $id
        ]);
        
        $data = [
            'status' => 'issued',
            'quantity_issued' => $quantityIssued,
            'issued_by' => $jsonData['issued_by'] ?? 'system',
            'issued_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $this->model->update($id, $data);

        // Audit log
        $this->auditLog('ISSUE', 'material_requisitions', $id, null, $data);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Materials issued successfully',
            'data' => $this->model->find($id)
        ]);
    }

    /**
     * Return unused materials
     */
    public function returnMaterials($id = null)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'update')) {
            return $this->failForbidden('Insufficient permissions to return materials');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('material_requests', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this material request');
        }

        $request = $this->model->find($id);
        
        if (!$request) {
            return $this->failNotFound('Material request not found');
        }
        
        $jsonData = $this->request->getJSON(true);
        $quantityReturned = $jsonData['quantity_returned'];
        
        // Update inventory
        $this->updateInventoryStock($request['part_id'], $quantityReturned);
        
        // Create transaction record
        $this->createInventoryTransaction([
            'part_id' => $request['part_id'],
            'work_order_id' => $request['work_order_id'],
            'quantity' => $quantityReturned,
            'transaction_type' => 'return',
            'reference_id' => $id
        ]);
        
        $data = [
            'quantity_returned' => $quantityReturned,
            'returned_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $this->model->update($id, $data);

        // Audit log
        $this->auditLog('RETURN', 'material_requisitions', $id, null, $data);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Materials returned successfully',
            'data' => $this->model->find($id)
        ]);
    }

    /**
     * Reject material request
     */
    public function reject($id = null)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'update')) {
            return $this->failForbidden('Insufficient permissions to reject material requisitions');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('material_requests', $id, 'plant_id')) {
            return $this->failForbidden('Access denied to this material request');
        }

        $request = $this->model->find($id);
        
        if (!$request) {
            return $this->failNotFound('Material request not found');
        }
        
        $jsonData = $this->request->getJSON(true);
        
        $data = [
            'status' => 'rejected',
            'rejected_by' => $jsonData['rejected_by'] ?? 'system',
            'rejection_reason' => $jsonData['rejection_reason'] ?? '',
            'rejected_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $this->model->update($id, $data);

        // Audit log
        $this->auditLog('REJECT', 'material_requisitions', $id, null, $data);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Material request rejected',
            'data' => $this->model->find($id)
        ]);
    }

    // Helper Methods
    
    private function checkInventoryAvailability($partId, $quantityRequired)
    {
        $db = \Config\Database::connect();
        
        $query = "
            SELECT i.*, SUM(i.quantity) as total_available
            FROM inventory i
            INNER JOIN part_inventory_links pil ON i.id = pil.inventory_id
            WHERE pil.part_id = ?
            GROUP BY i.id
        ";
        
        $result = $db->query($query, [$partId])->getRow();
        
        if (!$result) {
            return [
                'available' => false,
                'current_stock' => 0,
                'required' => $quantityRequired
            ];
        }
        
        return [
            'available' => $result->total_available >= $quantityRequired,
            'current_stock' => $result->total_available,
            'required' => $quantityRequired,
            'location' => $result->location ?? 'Unknown'
        ];
    }
    
    private function updateInventoryStock($partId, $quantityChange)
    {
��� �c�   �o@�  �                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             *
   & &���/                    �C�a    �C�Ims-vscode  pC�%ms-vscode-remote.remote-wsl{"wsl.downloadInProgress":false,"VSCode.ABExp.FeatureData":{"features":["autoModelEnabled","config.chat.todoListTool.enabled","config.editor.inlineSuggest.experimental.triggerCommandOnProviderChange","config.github.copilot.chat.advanced.enableReadFi
