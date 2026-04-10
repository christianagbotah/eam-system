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
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);
            $userRole = is_object($jwtData) ? ($jwtData->role ?? null) : ($jwtData['role'] ?? null);

            $builder = $this->db->table('work_order_tool_requests tr');
            $builder->select('tr.*, wo.work_order_number, u1.username as requested_by_name, u2.username as approved_by_name,
                             (SELECT COUNT(*) FROM work_order_tool_request_items WHERE tool_request_id = tr.id) as items_count');
            $builder->join('work_orders wo', 'wo.id = tr.work_order_id', 'left');
            $builder->join('users u1', 'u1.id = tr.requested_by', 'left');
            $builder->join('users u2', 'u2.id = tr.approved_by', 'left');
            $builder->where('tr.plant_id', $plantId);

            if ($this->request->getGet('work_order_id')) {
                $builder->where('tr.work_order_id', $this->request->getGet('work_order_id'));
            } else {
                if ($userRole === 'technician') {
                    $builder->where('tr.requested_by', $userId);
                } elseif ($userRole === 'supervisor') {
                    $builder->where('u1.supervisor_id', $userId);
                }
            }

            $builder->orderBy('tr.created_at', 'DESC');
            $requests = $builder->get()->getResultArray();

            // Get items for each request
            foreach ($requests as &$request) {
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
                'tools' => 'required|array',
                'reason' => 'permit_empty|string'
            ];

            if (!$this->validate($rules)) {
                return $this->fail($this->validator->getErrors(), 400);
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
