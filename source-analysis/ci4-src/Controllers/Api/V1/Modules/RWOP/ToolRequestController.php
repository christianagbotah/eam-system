<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseApiController;

class ToolRequestController extends BaseApiController
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    private function generateRequestNumber()
    {
        $year = date('Y');
        $lastRequest = $this->db->table('work_order_tool_requests')
            ->like('request_number', "TR-{$year}-", 'after')
            ->orderBy('id', 'DESC')
            ->get()->getRowArray();
        
        if ($lastRequest) {
            $lastNum = (int)substr($lastRequest['request_number'], -4);
            $newNum = $lastNum + 1;
        } else {
            $newNum = 1;
        }
        
        return 'TR-' . $year . '-' . str_pad($newNum, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get all tool requests (headers only)
     * GET /api/v1/eam/tool-requests
     */
    public function index()
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? $jwtData->user_id ?? null) : ($jwtData['id'] ?? $jwtData['user_id'] ?? null);
            $userRole = is_object($jwtData) ? ($jwtData->role ?? null) : ($jwtData['role'] ?? null);

            log_message('info', '=== TOOL REQUESTS INDEX ===');
            log_message('info', 'User ID: ' . $userId);
            log_message('info', 'User Role: ' . $userRole);
            log_message('info', 'Plant ID: ' . $plantId);
            log_message('info', 'Work Order ID filter: ' . ($this->request->getGet('work_order_id') ?? 'none'));

            $builder = $this->db->table('work_order_tool_requests tr');
            $builder->select('tr.*, wo.work_order_number, wo.title as work_order_title, 
                             u1.username as requested_by_name, 
                             COALESCE(CONCAT(u1.first_name, " ", u1.last_name), u1.full_name, u1.staff_id, u1.username) as technician_name, 
                             u2.username as approved_by_name,
                             (SELECT COUNT(*) FROM work_order_tool_request_items WHERE tool_request_id = tr.id) as items_count');
            $builder->join('work_orders wo', 'wo.id = tr.work_order_id', 'left');
            $builder->join('users u1', 'u1.id = tr.requested_by', 'left');
            $builder->join('users u2', 'u2.id = tr.approved_by', 'left');
            $builder->where('tr.plant_id', $plantId);

            if ($this->request->getGet('work_order_id')) {
                $builder->where('tr.work_order_id', $this->request->getGet('work_order_id'));
            } else {
                // Role-based filtering
                if ($userRole === 'technician') {
                    log_message('info', 'Applying technician filter: requested_by = ' . $userId);
                    $builder->where('tr.requested_by', $userId);
                } elseif ($userRole === 'supervisor') {
                    // Supervisor can see requests from their technicians
                    $builder->groupStart();
                    $builder->where('u1.supervisor_id', $userId);
                    $builder->orWhere('EXISTS (SELECT 1 FROM work_order_assignments woa 
                        JOIN users u ON u.id = woa.assigned_to_user_id 
                        WHERE woa.work_order_id = tr.work_order_id 
                        AND u.supervisor_id = ' . $userId . ')', null, false);
                    $builder->groupEnd();
                } elseif ($userRole === 'planner') {
                    // Planner can see requests for work orders they created
                    $builder->where('wo.planner_id', $userId);
                } elseif (!in_array($userRole, ['admin', 'manager', 'shop-attendant'])) {
                    // Other roles see nothing unless admin/manager/shop-attendant
                    $builder->where('1=0', null, false);
                }
            }

            $builder->orderBy('tr.created_at', 'DESC');
            
            // Log the SQL query
            $sql = $builder->getCompiledSelect(false);
            log_message('info', 'SQL Query: ' . $sql);
            
            $requests = $builder->get()->getResultArray();
            log_message('info', 'Found ' . count($requests) . ' requests');

            // Get items for each request
            foreach ($requests as &$request) {
                // Fix empty request_status based on other fields
                if (empty($request['request_status'])) {
                    if (!empty($request['returned_at'])) {
                        $request['request_status'] = 'COMPLETED';
                    } elseif (!empty($request['issued_at'])) {
                        $request['request_status'] = 'ISSUED';
                    } elseif (!empty($request['approved_at'])) {
                        $request['request_status'] = 'APPROVED';
                    } else {
                        $request['request_status'] = 'PENDING';
                    }
                }
                
                $items = $this->db->table('work_order_tool_request_items ti')
                    ->select('ti.*, t.tool_name, t.tool_code, t.category')
                    ->join('tools t', 't.id = ti.tool_id', 'left')
                    ->where('ti.tool_request_id', $request['id'])
                    ->get()->getResultArray();
                $request['items'] = $items;
            }

            return $this->respond(['status' => 'success', 'data' => $requests]);
        } catch (\Exception $e) {
            return $this->fail('Failed to fetch tool requests: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create tool request with multiple tools
     * POST /api/v1/eam/tool-requests
     */
    public function create()
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? $jwtData->user_id ?? null) : ($jwtData['id'] ?? $jwtData['user_id'] ?? null);

            $data = $this->request->getJSON(true);

            $rules = [
                'work_order_id' => 'required|integer',
                'reason' => 'permit_empty|string'
            ];

            if (!$this->validate($rules)) {
                return $this->fail($this->validator->getErrors(), 400);
            }

            if (!isset($data['tools']) || !is_array($data['tools']) || empty($data['tools'])) {
                return $this->fail('Tools array is required', 400);
            }

            $this->db->transStart();

            // Create header
            $requestNumber = $this->generateRequestNumber();
            $headerData = [
                'request_number' => $requestNumber,
                'plant_id' => $plantId,
                'work_order_id' => $data['work_order_id'],
                'requested_by' => $userId,
                'reason' => $data['reason'] ?? null,
                'request_status' => 'PENDING',
                'required_from_date' => date('Y-m-d H:i:s'),
                'expected_return_date' => $data['expected_return_date'] ?? null,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];

            $this->db->table('work_order_tool_requests')->insert($headerData);
            $requestId = $this->db->insertID();

            // Create items
            foreach ($data['tools'] as $tool) {
                $itemData = [
                    'tool_request_id' => $requestId,
                    'tool_id' => $tool['tool_id'],
                    'quantity' => $tool['quantity'] ?? 1,
                    'created_at' => date('Y-m-d H:i:s')
                ];
                $this->db->table('work_order_tool_request_items')->insert($itemData);

                // Reserve tool
                $this->db->table('tools')->where('id', $tool['tool_id'])->update([
                    'availability_status' => 'RESERVED',
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }

            $this->db->transComplete();

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Tool request created successfully',
                'data' => ['id' => $requestId, 'request_number' => $requestNumber]
            ]);
        } catch (\Exception $e) {
            return $this->fail('Failed to create tool request: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Approve entire request
     * POST /api/v1/eam/tool-requests/{id}/approve
     */
    public function approve($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);

            $request = $this->db->table('work_order_tool_requests')
                ->where('id', $id)->where('plant_id', $plantId)->get()->getRowArray();

            if (!$request || $request['request_status'] !== 'PENDING') {
                return $this->fail('Invalid request', 400);
            }

            $this->db->table('work_order_tool_requests')->where('id', $id)->update([
                'request_status' => 'APPROVED',
                'approved_by' => $userId,
                'approved_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            return $this->respond(['status' => 'success', 'message' => 'Request approved']);
        } catch (\Exception $e) {
            return $this->fail('Failed to approve: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject entire request
     * POST /api/v1/eam/tool-requests/{id}/reject
     */
    public function reject($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);

            $data = $this->request->getJSON(true);
            $reason = $data['reason'] ?? 'No reason provided';

            $request = $this->db->table('work_order_tool_requests')
                ->where('id', $id)->where('plant_id', $plantId)->get()->getRowArray();

            if (!$request || $request['request_status'] !== 'PENDING') {
                return $this->fail('Invalid request', 400);
            }

            $this->db->transStart();

            $this->db->table('work_order_tool_requests')->where('id', $id)->update([
                'request_status' => 'REJECTED',
                'approved_by' => $userId,
                'approved_at' => date('Y-m-d H:i:s'),
                'rejected_reason' => $reason,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Release all tools
            $items = $this->db->table('work_order_tool_request_items')
                ->where('tool_request_id', $id)->get()->getResultArray();
            
            foreach ($items as $item) {
                $this->db->table('tools')->where('id', $item['tool_id'])->update([
                    'availability_status' => 'AVAILABLE',
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }

            $this->db->transComplete();

            return $this->respond(['status' => 'success', 'message' => 'Request rejected']);
        } catch (\Exception $e) {
            return $this->fail('Failed to reject: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cancel request
     * POST /api/v1/eam/tool-requests/{id}/cancel
     */
    public function cancel($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? $jwtData->user_id ?? null) : ($jwtData['id'] ?? $jwtData['user_id'] ?? null);

            $request = $this->db->table('work_order_tool_requests')
                ->where('id', $id)->where('plant_id', $plantId)->where('requested_by', $userId)->get()->getRowArray();

            if (!$request || !in_array($request['request_status'], ['PENDING', 'APPROVED'])) {
                return $this->fail('Cannot cancel request', 400);
            }

            $this->db->transStart();

            $this->db->table('work_order_tool_requests')->where('id', $id)->update([
                'request_status' => 'CANCELLED',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Release all tools
            $items = $this->db->table('work_order_tool_request_items')
                ->where('tool_request_id', $id)->get()->getResultArray();
            
            foreach ($items as $item) {
                $this->db->table('tools')->where('id', $item['tool_id'])->update([
                    'availability_status' => 'AVAILABLE',
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }

            $this->db->transComplete();

            return $this->respond(['status' => 'success', 'message' => 'Request cancelled']);
        } catch (\Exception $e) {
            return $this->fail('Failed to cancel: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Issue tools (Shop Attendant/Admin)
     * POST /api/v1/eam/tool-requests/{id}/issue
     */
    public function issue($id)
    {
        try {
            log_message('info', '=== TOOL ISSUANCE START ===');
            log_message('info', 'Request ID: ' . $id);
            
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            log_message('info', 'Plant ID: ' . $plantId);
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = null;
            if (is_object($jwtData)) {
                $userId = $jwtData->id ?? $jwtData->user_id ?? null;
            } elseif (is_array($jwtData)) {
                $userId = $jwtData['id'] ?? $jwtData['user_id'] ?? null;
            }
            
            // Fallback: get from session or request
            if (!$userId) {
                $session = session();
                $userId = $session->get('user_id') ?? 1; // Default to admin if not found
            }
            
            log_message('info', 'User ID: ' . $userId);

            $data = $this->request->getJSON(true);
            log_message('info', 'Request data: ' . json_encode($data));

            $request = $this->db->table('work_order_tool_requests')
                ->where('id', $id)->where('plant_id', $plantId)->get()->getRowArray();

            if (!$request) {
                log_message('error', 'Request not found');
                return $this->fail('Request not found', 404);
            }
            
            if ($request['request_status'] !== 'APPROVED') {
                log_message('error', 'Request status is: ' . $request['request_status']);
                return $this->fail('Request must be approved before issuing', 400);
            }

            if (!isset($data['items']) || !is_array($data['items'])) {
                log_message('error', 'Items array missing or invalid');
                return $this->fail('Items array is required', 400);
            }

            $this->db->transStart();

            $allFullyIssued = true;
            foreach ($data['items'] as $item) {
                log_message('info', 'Processing item: ' . json_encode($item));
                
                $issuedQty = $item['issued_quantity'] ?? 0;
                $condition = $item['condition_on_issue'] ?? 'GOOD';
                $notes = $item['issue_notes'] ?? null;

                // Get requested quantity
                $requestItem = $this->db->table('work_order_tool_request_items')
                    ->where('id', $item['item_id'])->get()->getRowArray();
                
                if (!$requestItem) {
                    log_message('error', 'Request item not found: ' . $item['item_id']);
                    continue;
                }
                
                if ($issuedQty < $requestItem['quantity']) {
                    $allFullyIssued = false;
                }

                // Update item
                $updateData = [
                    'issued_quantity' => $issuedQty,
                    'condition_on_issue' => $condition,
                    'issue_notes' => $notes
                ];
                log_message('info', 'Updating item with: ' . json_encode($updateData));
                
                $this->db->table('work_order_tool_request_items')
                    ->where('id', $item['item_id'])
                    ->update($updateData);

                // Only create issue log and update tool if quantity > 0
                if ($issuedQty > 0) {
                    // Create issue log
                    $logData = [
                        'plant_id' => $plantId,
                        'tool_request_item_id' => $item['item_id'],
                        'tool_id' => $item['tool_id'],
                        'issued_by' => $userId,
                        'issued_to' => $request['requested_by'],
                        'quantity' => $issuedQty,
                        'condition_on_issue' => $condition,
                        'issue_notes' => $notes,
                        'issue_date' => date('Y-m-d H:i:s'),
                        'created_at' => date('Y-m-d H:i:s')
                    ];
                    log_message('info', 'Inserting issue log: ' . json_encode($logData));
                    
                    $this->db->table('tool_issue_logs')->insert($logData);

                    // Update tool status based on condition
                    $toolStatus = 'IN_USE';
                    if (in_array($condition, ['DAMAGED', 'UNDER_MAINTENANCE'])) {
                        $toolStatus = 'MAINTENANCE';
                    } elseif ($condition === 'NOT_AVAILABLE') {
                        $toolStatus = 'UNAVAILABLE';
                    }

                    log_message('info', 'Updating tool ' . $item['tool_id'] . ' to status: ' . $toolStatus);
                    $this->db->table('tools')->where('id', $item['tool_id'])->update([
                        'availability_status' => $toolStatus,
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                } else {
                    // If not issued, release the tool
                    $toolStatus = $condition === 'NOT_AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
                    log_message('info', 'Releasing tool ' . $item['tool_id'] . ' to status: ' . $toolStatus);
                    $this->db->table('tools')->where('id', $item['tool_id'])->update([
                        'availability_status' => $toolStatus,
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                }
            }

            // Update request status - PARTIAL_ISSUED if not all items fully issued
            $newStatus = $allFullyIssued ? 'ISSUED' : 'PARTIAL_ISSUED';
            log_message('info', 'Updating request status to: ' . $newStatus);
            
            $this->db->table('work_order_tool_requests')->where('id', $id)->update([
                'request_status' => $newStatus,
                'issued_by' => $userId,
                'issued_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            if ($this->db->transStatus() === false) {
                $this->db->transRollback();
                log_message('error', 'Transaction failed');
                return $this->fail('Transaction failed', 500);
            }
            
            $this->db->transComplete();
            log_message('info', '=== TOOL ISSUANCE SUCCESS ===');

            $message = $allFullyIssued ? 'Tools issued successfully' : 'Tools partially issued';
            return $this->respond(['status' => 'success', 'message' => $message]);
        } catch (\Exception $e) {
            log_message('error', 'Tool issuance exception: ' . $e->getMessage());
            log_message('error', 'Stack trace: ' . $e->getTraceAsString());
            return $this->fail('Failed to issue tools: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reverse/Undo tool issuance (Shop Attendant/Admin)
     * POST /api/v1/eam/tool-requests/{id}/reverse
     */
    public function reverse($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);
            if (!$userId) {
                $session = session();
                $userId = $session->get('user_id') ?? 1;
            }

            $request = $this->db->table('work_order_tool_requests')
                ->where('id', $id)->where('plant_id', $plantId)->get()->getRowArray();

            if (!$request) {
                return $this->fail('Request not found', 404);
            }

            // Fix empty status - determine actual status from timestamps
            $actualStatus = $request['request_status'];
            if (empty($actualStatus)) {
                if (!empty($request['returned_at'])) {
                    $actualStatus = 'COMPLETED';
                } elseif (!empty($request['issued_at'])) {
                    $actualStatus = 'ISSUED';
                } elseif (!empty($request['approved_at'])) {
                    $actualStatus = 'APPROVED';
                } else {
                    $actualStatus = 'PENDING';
                }
            }

            if (!in_array($actualStatus, ['ISSUED', 'PARTIAL_ISSUED'])) {
                return $this->fail('Can only reverse ISSUED or PARTIAL_ISSUED requests. Current status: ' . $actualStatus, 400);
            }

            $this->db->transStart();

            // Get all items
            $items = $this->db->table('work_order_tool_request_items')
                ->where('tool_request_id', $id)->get()->getResultArray();

            foreach ($items as $item) {
                // Reset item quantities and conditions
                $this->db->table('work_order_tool_request_items')
                    ->where('id', $item['id'])
                    ->update([
                        'issued_quantity' => 0,
                        'condition_on_issue' => null,
                        'issue_notes' => null
                    ]);

                // Delete issue logs for this item
                $this->db->table('tool_issue_logs')
                    ->where('tool_request_item_id', $item['id'])
                    ->delete();

                // Reset tool to RESERVED status
                $this->db->table('tools')->where('id', $item['tool_id'])->update([
                    'availability_status' => 'RESERVED',
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }

            // Reset request to APPROVED status
            $this->db->table('work_order_tool_requests')->where('id', $id)->update([
                'request_status' => 'APPROVED',
                'issued_by' => null,
                'issued_at' => null,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            $this->db->transComplete();

            return $this->respond(['status' => 'success', 'message' => 'Tool issuance reversed successfully. Request is now APPROVED and ready to be reissued.']);
        } catch (\Exception $e) {
            return $this->fail('Failed to reverse issuance: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Mark tools for return (Technician/Planner)
     * POST /api/v1/eam/tool-requests/{id}/mark-return
     */
    public function markReturn($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);

            $request = $this->db->table('work_order_tool_requests')
                ->where('id', $id)->where('plant_id', $plantId)->get()->getRowArray();

            if (!$request) {
                return $this->fail('Request not found', 404);
            }

            // Fix empty status - determine actual status from timestamps
            $actualStatus = $request['request_status'];
            if (empty($actualStatus)) {
                if (!empty($request['returned_at'])) {
                    $actualStatus = 'COMPLETED';
                } elseif (!empty($request['issued_at'])) {
                    $actualStatus = 'ISSUED';
                } elseif (!empty($request['approved_at'])) {
                    $actualStatus = 'APPROVED';
                } else {
                    $actualStatus = 'PENDING';
                }
            }

            if (!in_array($actualStatus, ['ISSUED', 'PARTIAL_ISSUED'])) {
                return $this->fail('Can only mark issued tools for return. Current status: ' . $actualStatus, 400);
            }

            $this->db->table('work_order_tool_requests')->where('id', $id)->update([
                'request_status' => 'RETURN_PENDING',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            return $this->respond(['status' => 'success', 'message' => 'Tools marked for return. Awaiting shop attendant verification.']);
        } catch (\Exception $e) {
            return $this->fail('Failed to mark return: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Return tools (Shop Attendant/Admin)
     * POST /api/v1/eam/tool-requests/{id}/return
     */
    public function returnTools($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);

            $data = $this->request->getJSON(true);

            $request = $this->db->table('work_order_tool_requests tr')
                ->select('tr.*, wo.id as work_order_id, wo.planner_id, u.supervisor_id')
                ->join('work_orders wo', 'wo.id = tr.work_order_id', 'left')
                ->join('users u', 'u.id = tr.requested_by', 'left')
                ->where('tr.id', $id)
                ->where('tr.plant_id', $plantId)
                ->get()->getRowArray();

            if (!$request || !in_array($request['request_status'], ['ISSUED', 'PARTIAL_ISSUED', 'RETURN_PENDING'])) {
                return $this->fail('Invalid request status', 400);
            }

            if (!isset($data['items']) || !is_array($data['items'])) {
                return $this->fail('Items array is required', 400);
            }

            $this->db->transStart();

            $damagedTools = [];
            foreach ($data['items'] as $item) {
                // Update item
                $this->db->table('work_order_tool_request_items')
                    ->where('id', $item['item_id'])
                    ->update([
                        'condition_on_return' => $item['condition_on_return'],
                        'damage_notes' => $item['damage_notes'] ?? null,
                        'penalty_cost' => $item['penalty_cost'] ?? 0
                    ]);

                // Update issue log
                $issueLog = $this->db->table('tool_issue_logs')
                    ->where('tool_request_item_id', $item['item_id'])
                    ->orderBy('id', 'DESC')
                    ->get()->getRowArray();

                if ($issueLog) {
                    $this->db->table('tool_issue_logs')->where('id', $issueLog['id'])->update([
                        'returned_by' => $userId,
                        'return_date' => date('Y-m-d H:i:s'),
                        'condition_on_return' => $item['condition_on_return'],
                        'damage_notes' => $item['damage_notes'] ?? null,
                        'penalty_cost' => $item['penalty_cost'] ?? 0,
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                }

                // Track damaged/lost tools
                if (in_array($item['condition_on_return'], ['DAMAGED', 'LOST'])) {
                    $toolInfo = $this->db->table('tools')->where('id', $item['tool_id'])->get()->getRowArray();
                    $damagedTools[] = [
                        'tool_name' => $toolInfo['tool_name'] ?? 'Unknown',
                        'tool_code' => $toolInfo['tool_code'] ?? '',
                        'condition' => $item['condition_on_return'],
                        'notes' => $item['damage_notes'] ?? '',
                        'cost' => $item['penalty_cost'] ?? 0
                    ];
                }

                // Update tool status
                $newStatus = in_array($item['condition_on_return'], ['DAMAGED', 'LOST']) ? 'MAINTENANCE' : 'AVAILABLE';
                $this->db->table('tools')->where('id', $item['tool_id'])->update([
                    'availability_status' => $newStatus,
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }

            // Update request status
            $this->db->table('work_order_tool_requests')->where('id', $id)->update([
                'request_status' => 'COMPLETED',
                'returned_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Create notifications for damaged/lost tools
            if (!empty($damagedTools)) {
                $notifyUsers = array_filter([
                    $request['requested_by'], // Technician
                    $request['planner_id'], // Planner
                    $request['supervisor_id'] // Supervisor
                ]);
                
                $toolsList = implode(', ', array_map(fn($t) => $t['tool_name'] . ' (' . $t['condition'] . ')', $damagedTools));
                $message = 'Tools returned damaged/lost: ' . $toolsList . ' for request ' . $request['request_number'];
                
                foreach (array_unique($notifyUsers) as $notifyUserId) {
                    $this->db->table('notifications')->insert([
                        'user_id' => $notifyUserId,
                        'type' => 'TOOL_DAMAGE',
                        'title' => 'Tool Damage/Loss Alert',
                        'message' => $message,
                        'reference_type' => 'tool_request',
                        'reference_id' => $id,
                        'is_read' => 0,
                        'created_at' => date('Y-m-d H:i:s')
                    ]);
                }
            }

            $this->db->transComplete();

            return $this->respond(['status' => 'success', 'message' => 'Tools returned successfully']);
        } catch (\Exception $e) {
            return $this->fail('Failed to return tools: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get tools
     * GET /api/v1/eam/tools
     */
    public function getTools()
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;

            $tools = $this->db->table('tools')
                ->where('plant_id', $plantId)
                ->where('is_active', 1)
                ->orderBy('tool_name', 'ASC')
                ->get()->getResultArray();

            return $this->respond(['status' => 'success', 'data' => $tools]);
        } catch (\Exception $e) {
            return $this->fail('Failed to fetch tools: ' . $e->getMessage(), 500);
        }
    }
}
