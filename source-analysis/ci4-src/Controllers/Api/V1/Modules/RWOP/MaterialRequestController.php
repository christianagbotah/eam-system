<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseApiController;

class MaterialRequestController extends BaseApiController
{
    public function index()
    {
        $db = \Config\Database::connect();
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        $status = $this->request->getGet('status');
        $workOrderId = $this->request->getGet('work_order_id');
        
        $builder = $db->table('material_requests')
            ->select('material_requests.*, work_orders.work_order_number, work_orders.title as work_order_title, users.username as requested_by_name')
            ->join('work_orders', 'work_orders.id = material_requests.work_order_id', 'left')
            ->join('users', 'users.id = material_requests.requested_by', 'left')
            ->orderBy('material_requests.created_at', 'DESC');
        
        if ($status) {
            $builder->where('material_requests.status', $status);
        }
        
        if ($workOrderId) {
            $builder->where('material_requests.work_order_id', $workOrderId);
        }
        
        $requests = $builder->get()->getResultArray();
        
        // Get items for each request
        foreach ($requests as &$request) {
            $items = $db->table('material_request_items')
                ->select('material_request_items.*, parts.part_name, parts.part_number, parts.unit_of_measure')
                ->join('parts', 'parts.id = material_request_items.part_id', 'left')
                ->where('material_request_id', $request['id'])
                ->get()
                ->getResultArray();
            $request['items'] = $items;
        }
        
        return $this->respond([
            'status' => 'success',
            'data' => $requests
        ]);
    }
    
    public function show($id = null)
    {
        $db = \Config\Database::connect();
        
        $request = $db->table('material_requests')
            ->select('material_requests.*, work_orders.work_order_number, work_orders.title as work_order_title, users.username as requested_by_name, approver.username as approved_by_name, issuer.username as issued_by_name')
            ->join('work_orders', 'work_orders.id = material_requests.work_order_id', 'left')
            ->join('users', 'users.id = material_requests.requested_by', 'left')
            ->join('users approver', 'approver.id = material_requests.approved_by', 'left')
            ->join('users issuer', 'issuer.id = material_requests.issued_by', 'left')
            ->where('material_requests.id', $id)
            ->get()
            ->getRowArray();
        
        if (!$request) {
            return $this->failNotFound('Material request not found');
        }
        
        $items = $db->table('material_request_items')
            ->select('material_request_items.*, parts.part_name, parts.part_number, parts.unit_of_measure, parts.current_stock')
            ->join('parts', 'parts.id = material_request_items.part_id', 'left')
            ->where('material_request_id', $id)
            ->get()
            ->getResultArray();
        
        $request['items'] = $items;
        
        return $this->respond([
            'status' => 'success',
            'data' => $request
        ]);
    }
    
    public function create()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        if (!isset($data['work_order_id']) || !isset($data['items']) || empty($data['items'])) {
            return $this->fail('Work order and items are required');
        }
        
        $db->transStart();
        
        // Generate request number
        $count = $db->table('material_requests')->countAll();
        $requestNumber = 'MR-' . date('Ymd') . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
        
        // Create request
        $requestData = [
            'request_number' => $requestNumber,
            'work_order_id' => $data['work_order_id'],
            'requested_by' => $userId,
            'priority' => $data['priority'] ?? 'normal',
            'notes' => $data['notes'] ?? null,
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $db->table('material_requests')->insert($requestData);
        $requestId = $db->insertID();
        
        // Create items
        foreach ($data['items'] as $item) {
            $db->table('material_request_items')->insert([
                'material_request_id' => $requestId,
                'part_id' => $item['part_id'],
                'quantity_requested' => $item['quantity'],
                'quantity_approved' => 0,
                'quantity_issued' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
        
        $db->transComplete();
        
        if ($db->transStatus() === false) {
            return $this->fail('Failed to create material request');
        }
        
        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Material request created successfully',
            'data' => ['id' => $requestId, 'request_number' => $requestNumber]
        ]);
    }
    
    public function approve($id = null)
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        $request = $db->table('material_requests')->where('id', $id)->get()->getRowArray();
        
        if (!$request) {
            return $this->failNotFound('Material request not found');
        }
        
        if ($request['status'] !== 'pending') {
            return $this->fail('Only pending requests can be approved');
        }
        
        $db->transStart();
        
        // Update request
        $db->table('material_requests')->where('id', $id)->update([
            'status' => 'approved',
            'approved_by' => $userId,
            'approved_at' => date('Y-m-d H:i:s'),
            'approval_notes' => $data['notes'] ?? null
        ]);
        
        // Update items with approved quantities
        if (isset($data['items'])) {
            foreach ($data['items'] as $item) {
                $db->table('material_request_items')
                    ->where('id', $item['id'])
                    ->update(['quantity_approved' => $item['quantity_approved']]);
            }
        }
        
        $db->transComplete();
        
        if ($db->transStatus() === false) {
            return $this->fail('Failed to approve material request');
        }
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Material request approved successfully'
        ]);
    }
    
    public function issue($id = null)
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        $request = $db->table('material_requests')->where('id', $id)->get()->getRowArray();
        
        if (!$request) {
            return $this->failNotFound('Material request not found');
        }
        
        if ($request['status'] !== 'approved') {
            return $this->fail('Only approved requests can be issued');
        }
        
        $db->transStart();
        
        // Update items with issued quantities and reduce stock
        foreach ($data['items'] as $item) {
            $db->table('material_request_items')
                ->where('id', $item['id'])
                ->update(['quantity_issued' => $item['quantity_issued']]);
            
            // Reduce stock
            $db->query("UPDATE parts SET current_stock = current_stock - ? WHERE id = ?", [
                $item['quantity_issued'],
                $item['part_id']
            ]);
            
            // Create stock transaction
            $db->table('stock_transactions')->insert([
                'part_id' => $item['part_id'],
                'transaction_type' => 'issue',
                'quantity' => -$item['quantity_issued'],
                'reference_type' => 'material_request',
                'reference_id' => $id,
                'performed_by' => $userId,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
        
        // Update request
        $db->table('material_requests')->where('id', $id)->update([
            'status' => 'issued',
            'issued_by' => $userId,
            'issued_at' => date('Y-m-d H:i:s'),
            'issue_notes' => $data['notes'] ?? null
        ]);
        
        $db->transComplete();
        
        if ($db->transStatus() === false) {
            return $this->fail('Failed to issue materials');
        }
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Materials issued successfully'
        ]);
    }
    
    public function reject($id = null)
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        $request = $db->table('material_requests')->where('id', $id)->get()->getRowArray();
        
        if (!$request) {
            return $this->failNotFound('Material request not found');
        }
        
        if (!in_array($request['status'], ['pending', 'approved'])) {
            return $this->fail('Cannot reject this request');
        }
        
        $db->table('material_requests')->where('id', $id)->update([
            'status' => 'rejected',
            'approved_by' => $userId,
            'approved_at' => date('Y-m-d H:i:s'),
            'approval_notes' => $data['reason'] ?? 'Rejected'
        ]);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Material request rejected'
        ]);
    }
    
    public function cancel($id = null)
    {
        $db = \Config\Database::connect();
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        $request = $db->table('material_requests')->where('id', $id)->get()->getRowArray();
        
        if (!$request) {
            return $this->failNotFound('Material request not found');
        }
        
        if ($request['requested_by'] != $userId) {
            return $this->fail('You can only cancel your own requests');
        }
        
        if ($request['status'] !== 'pending') {
            return $this->fail('Only pending requests can be cancelled');
        }
        
        $db->table('material_requests')->where('id', $id)->update([
            'status' => 'cancelled'
        ]);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Material request cancelled'
        ]);
    }
}
