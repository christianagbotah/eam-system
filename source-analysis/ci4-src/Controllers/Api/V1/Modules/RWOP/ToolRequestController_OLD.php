<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseApiController;
use CodeIgniter\HTTP\ResponseInterface;

class ToolRequestController extends BaseApiController
{
    protected $toolModel;
    protected $toolRequestModel;
    protected $toolIssueLogModel;
    protected $workOrderModel;
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->toolModel = new \App\Models\ToolModel();
        $this->workOrderModel = model('WorkOrderModel');
    }

    /**
     * Get all tool requests with filters
     * GET /api/v1/eam/tool-requests
     */
    public function index()
    {
        try {
            $plantIds = $this->getPlantIds();
            if (is_object($plantIds)) {
                $plantIds = (array)$plantIds;
            }
            $plantId = is_array($plantIds) && !empty($plantIds) ? $plantIds[0] : null;
            if (!$plantId) {
                return $this->fail('No plant assigned', 403);
            }
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);
            $userRole = is_object($jwtData) ? ($jwtData->role ?? null) : ($jwtData['role'] ?? null);

            $builder = $this->db->table('work_order_tool_requests tr');
            $builder->select('tr.*, t.tool_name, t.tool_code, t.category, wo.work_order_number, 
                             u1.username as requested_by_name, u2.username as approved_by_name');
            $builder->join('tools t', 't.id = tr.tool_id', 'left');
            $builder->join('work_orders wo', 'wo.id = tr.work_order_id', 'left');
            $builder->join('users u1', 'u1.id = tr.requested_by', 'left');
            $builder->join('users u2', 'u2.id = tr.approved_by', 'left');
            $builder->where('tr.plant_id', $plantId);

            // Filters
            if ($this->request->getGet('work_order_id')) {
                $builder->where('tr.work_order_id', $this->request->getGet('work_order_id'));
            } else {
                // Role-based filtering
                if ($userRole === 'technician') {
                    $builder->where('tr.requested_by', $userId);
                } elseif ($userRole === 'supervisor') {
                    $builder->where('u1.supervisor_id', $userId);
                }
                // Admin/planner sees all
            }
            if ($this->request->getGet('status')) {
                $builder->where('tr.request_status', $this->request->getGet('status'));
            }
            if ($this->request->getGet('tool_id')) {
                $builder->where('tr.tool_id', $this->request->getGet('tool_id'));
            }

            $builder->orderBy('tr.created_at', 'DESC');
            $requests = $builder->get()->getResultArray();

            return $this->respond([
                'status' => 'success',
                'data' => $requests
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Tool requests fetch error: ' . $e->getMessage());
            return $this->fail('Failed to fetch tool requests: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Step 1: Technician Requests Tool
     * POST /api/v1/eam/tool-requests
     */
    public function create()
    {
        try {
            $plantIds = $this->getPlantIds();
            if (is_object($plantIds)) {
                $plantIds = (array)$plantIds;
            }
            $plantId = is_array($plantIds) && !empty($plantIds) ? $plantIds[0] : null;
            if (!$plantId) {
                return $this->fail('No plant assigned', 403);
            }
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? $jwtData->user_id ?? null) : (is_array($jwtData) ? ($jwtData['id'] ?? $jwtData['user_id'] ?? null) : null);

            $data = $this->request->getJSON(true);

            // Check if bulk request (array of tool_ids)
            if (isset($data['tool_ids']) && is_array($data['tool_ids'])) {
                return $this->createBulk($data, $plantId, $userId, $jwtData);
            }

            // Single tool request
            $rules = [
                'work_order_id' => 'required|integer',
                'tool_id' => 'required|integer',
                'quantity' => 'permit_empty|integer',
                'reason' => 'permit_empty|string',
                'expected_return_date' => 'permit_empty|valid_date'
            ];

            if (!$this->validate($rules)) {
                return $this->fail($this->validator->getErrors(), 400);
            }

            // Verify work order access
            $workOrder = $this->db->table('work_orders')->where('id', $data['work_order_id'])->get()->getRowArray();
            if (!$workOrder) {
                return $this->fail('Work order not found', 404);
            }

            $jwtRole = is_object($jwtData) ? ($jwtData->role ?? null) : ($jwtData['role'] ?? null);
            
            if ($jwtRole !== 'admin' && $jwtRole !== 'planner') {
                $isAssigned = ($workOrder['assigned_to'] && $workOrder['assigned_to'] == $userId);
                if (!$isAssigned) {
                    $teamMember = $this->db->table('work_order_team_members')
                        ->where('work_order_id', $data['work_order_id'])
                        ->where('technician_id', $userId)
                        ->get()->getRowArray();
                    $isAssigned = !empty($teamMember);
                }

                if (!$isAssigned) {
                    return $this->fail('You are not assigned to this work order', 403);
                }
            }

            // Check tool availability
            $tool = $this->db->table('tools')->where('id', $data['tool_id'])->where('plant_id', $plantId)->get()->getRowArray();
            if (!$tool) {
                return $this->fail('Tool not found', 404);
            }

            // Check if tool is already reserved for THIS work order
            $existingRequest = $this->db->table('work_order_tool_requests')
                ->where('work_order_id', $data['work_order_id'])
                ->where('tool_id', $data['tool_id'])
                ->whereIn('request_status', ['PENDING', 'APPROVED', 'ISSUED'])
                ->get()->getRowArray();

            if ($existingRequest) {
                return $this->fail('Tool is already requested for this work order', 400);
            }

            // Check if tool is reserved for ANOTHER work order
            if ($tool['availability_status'] !== 'AVAILABLE') {
                $otherRequest = $this->db->table('work_order_tool_requests')
                    ->where('tool_id', $data['tool_id'])
                    ->whereIn('request_status', ['PENDING', 'APPROVED', 'ISSUED'])
                    ->get()->getRowArray();
                
                if ($otherRequest && $otherRequest['work_order_id'] != $data['work_order_id']) {
                    return $this->fail('Tool is reserved for another work order', 400);
                }
            }

            // Check calibration if required
            if ($tool['is_calibrated'] && $tool['calibration_due_date']) {
                if (strtotime($tool['calibration_due_date']) < time()) {
                    return $this->fail('Tool calibration is overdue. Cannot issue until recalibrated.', 400);
                }
            }

            // Transaction start
            $this->db->transStart();

            // Create request
            $requestData = [
                'plant_id' => $plantId,
                'work_order_id' => $data['work_order_id'],
                'requested_by' => $userId,
                'tool_id' => $data['tool_id'],
                'quantity' => $data['quantity'] ?? 1,
                'reason' => $data['reason'] ?? null,
                'request_status' => 'PENDING',
                'required_from_date' => date('Y-m-d H:i:s'),
                'expected_return_date' => $data['expected_return_date'] ?? null,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];

            $this->db->table('work_order_tool_requests')->insert($requestData);
            $requestId = $this->db->insertID();

            // Reserve tool
            $this->db->table('tools')->where('id', $data['tool_id'])->update([
                'availability_status' => 'RESERVED',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Audit log
            $this->logAudit('tool_request_created', 'work_order_tool_requests', $requestId, [
                'tool_id' => $data['tool_id'],
                'work_order_id' => $data['work_order_id'],
                'status' => 'PENDING'
            ]);

            $this->db->transComplete();

            if ($this->db->transStatus() === false) {
                return $this->fail('Failed to create tool request', 500);
            }

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Tool request created successfully',
                'data' => ['id' => $requestId]
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Tool request creation error: ' . $e->getMessage());
            return $this->fail('Failed to create tool request: ' . $e->getMessage(), 500);
        }
    }

    private function createBulk($data, $plantId, $userId, $jwtData)
    {
        $workOrderId = $data['work_order_id'] ?? null;
        $toolIds = $data['tool_ids'];
        $reason = $data['reason'] ?? null;
        $expectedReturnDate = $data['expected_return_date'] ?? null;

        if (!$workOrderId || empty($toolIds)) {
            return $this->fail('work_order_id and tool_ids are required', 400);
        }

        // Verify work order access
        $workOrder = $this->db->table('work_orders')->where('id', $workOrderId)->get()->getRowArray();
        if (!$workOrder) {
            return $this->fail('Work order not found', 404);
        }

        $jwtRole = is_object($jwtData) ? ($jwtData->role ?? null) : ($jwtData['role'] ?? null);
        
        if ($jwtRole !== 'admin' && $jwtRole !== 'planner') {
            $isAssigned = ($workOrder['assigned_to'] && $workOrder['assigned_to'] == $userId);
            if (!$isAssigned) {
                $teamMember = $this->db->table('work_order_team_members')
                    ->where('work_order_id', $workOrderId)
                    ->where('technician_id', $userId)
                    ->get()->getRowArray();
                $isAssigned = !empty($teamMember);
            }

            if (!$isAssigned) {
                return $this->fail('You are not assigned to this work order', 403);
            }
        }

        $this->db->transStart();

        $created = [];
        $errors = [];

        foreach ($toolIds as $toolId) {
            $tool = $this->db->table('tools')->where('id', $toolId)->where('plant_id', $plantId)->get()->getRowArray();
            
            if (!$tool) {
                $errors[] = "Tool ID {$toolId}: not found";
                continue;
            }

            // Check existing request
            $existingRequest = $this->db->table('work_order_tool_requests')
                ->where('work_order_id', $workOrderId)
                ->where('tool_id', $toolId)
                ->whereIn('request_status', ['PENDING', 'APPROVED', 'ISSUED'])
                ->get()->getRowArray();

            if ($existingRequest) {
                $errors[] = "{$tool['tool_name']}: already requested";
                continue;
            }

            // Check if reserved for another work order
            if ($tool['availability_status'] !== 'AVAILABLE') {
                $otherRequest = $this->db->table('work_order_tool_requests')
                    ->where('tool_id', $toolId)
                    ->whereIn('request_status', ['PENDING', 'APPROVED', 'ISSUED'])
                    ->get()->getRowArray();
                
                if ($otherRequest && $otherRequest['work_order_id'] != $workOrderId) {
                    $errors[] = "{$tool['tool_name']}: reserved for another work order";
                    continue;
                }
            }

            // Create request
            $requestData = [
                'plant_id' => $plantId,
                'work_order_id' => $workOrderId,
                'requested_by' => $userId,
                'tool_id' => $toolId,
                'quantity' => 1,
                'reason' => $reason,
                'request_status' => 'PENDING',
                'required_from_date' => date('Y-m-d H:i:s'),
                'expected_return_date' => $expectedReturnDate,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];

            $this->db->table('work_order_tool_requests')->insert($requestData);
            $requestId = $this->db->insertID();

            // Reserve tool
            $this->db->table('tools')->where('id', $toolId)->update([
                'availability_status' => 'RESERVED',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            $created[] = $tool['tool_name'];
        }

        $this->db->transComplete();

        if (empty($created)) {
            return $this->fail('No tools were requested. Errors: ' . implode(', ', $errors), 400);
        }

        return $this->respondCreated([
            'status' => 'success',
            'message' => count($created) . ' tool(s) requested successfully',
            'data' => [
                'created' => $created,
                'errors' => $errors
            ]
        ]);
    }

    /**
     * Step 2: Supervisor/Planner Approval
     * POST /api/v1/eam/tool-requests/{id}/approve
     */
    public function approve($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            if (is_object($plantIds)) {
                $plantIds = (array)$plantIds;
            }
            $plantId = is_array($plantIds) && !empty($plantIds) ? $plantIds[0] : null;
            if (!$plantId) {
                return $this->fail('No plant assigned', 403);
            }
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);
            $userRole = is_object($jwtData) ? ($jwtData->role ?? null) : ($jwtData['role'] ?? null);

            // Only supervisors, planners, and admins can approve
            if (!in_array($userRole, ['supervisor', 'planner', 'admin'])) {
                return $this->fail('Unauthorized to approve tool requests', 403);
            }

            $request = $this->db->table('work_order_tool_requests')
                ->where('id', $id)
                ->where('plant_id', $plantId)
                ->get()->getRowArray();

            if (!$request) {
                return $this->fail('Tool request not found', 404);
            }

            if ($request['request_status'] !== 'PENDING') {
                return $this->fail('Request is not in PENDING status', 400);
            }

            $this->db->transStart();

            $this->db->table('work_order_tool_requests')->where('id', $id)->update([
                'request_status' => 'APPROVED',
                'approved_by' => $userId,
                'approved_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            $this->logAudit('tool_request_approved', 'work_order_tool_requests', $id, [
                'approved_by' => $userId
            ]);

            $this->db->transComplete();

            return $this->respond([
                'status' => 'success',
                'message' => 'Tool request approved successfully'
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Tool request approval error: ' . $e->getMessage());
            return $this->fail('Failed to approve tool request: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Step 2: Supervisor/Planner Rejection
     * POST /api/v1/eam/tool-requests/{id}/reject
     */
    public function reject($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            if (is_object($plantIds)) {
                $plantIds = (array)$plantIds;
            }
            $plantId = is_array($plantIds) && !empty($plantIds) ? $plantIds[0] : null;
            if (!$plantId) {
                return $this->fail('No plant assigned', 403);
            }
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);
            $userRole = is_object($jwtData) ? ($jwtData->role ?? null) : ($jwtData['role'] ?? null);

            // Only supervisors, planners, and admins can reject
            if (!in_array($userRole, ['supervisor', 'planner', 'admin'])) {
                return $this->fail('Unauthorized to reject tool requests', 403);
            }

            $data = $this->request->getJSON(true);
            $reason = $data['reason'] ?? 'No reason provided';

            $request = $this->db->table('work_order_tool_requests')
                ->where('id', $id)
                ->where('plant_id', $plantId)
                ->get()->getRowArray();

            if (!$request) {
                return $this->fail('Tool request not found', 404);
            }

            if ($request['request_status'] !== 'PENDING') {
                return $this->fail('Request is not in PENDING status', 400);
            }

            $this->db->transStart();

            // Update request status
            $this->db->table('work_order_tool_requests')->where('id', $id)->update([
                'request_status' => 'REJECTED',
                'approved_by' => $userId,
                'approved_at' => date('Y-m-d H:i:s'),
                'rejected_reason' => $reason,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Release tool reservation
            $this->db->table('tools')->where('id', $request['tool_id'])->update([
                'availability_status' => 'AVAILABLE',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            $this->logAudit('tool_request_rejected', 'work_order_tool_requests', $id, [
                'rejected_by' => $userId,
                'reason' => $reason
            ]);

            $this->db->transComplete();

            return $this->respond([
                'status' => 'success',
                'message' => 'Tool request rejected successfully'
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Tool request rejection error: ' . $e->getMessage());
            return $this->fail('Failed to reject tool request: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Step 3: Store Issues Tool
     * POST /api/v1/eam/tool-requests/{id}/issue
     */
    public function issue($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            if (is_object($plantIds)) {
                $plantIds = (array)$plantIds;
            }
            $plantId = is_array($plantIds) && !empty($plantIds) ? $plantIds[0] : null;
            if (!$plantId) {
                return $this->fail('No plant assigned', 403);
            }
            $userId = $GLOBALS['jwt_user_data']['id'] ?? null;

            $data = $this->request->getJSON(true);
            $conditionOnIssue = $data['condition_on_issue'] ?? 'GOOD';

            $request = $this->db->table('work_order_tool_requests')
                ->where('id', $id)
                ->where('plant_id', $plantId)
                ->get()->getRowArray();

            if (!$request) {
                return $this->fail('Tool request not found', 404);
            }

            if ($request['request_status'] !== 'APPROVED') {
                return $this->fail('Request must be APPROVED before issuing', 400);
            }

            // Check tool is still reserved
            $tool = $this->db->table('tools')->where('id', $request['tool_id'])->get()->getRowArray();
            if ($tool['availability_status'] === 'ISSUED') {
                return $this->fail('Tool is already issued to someone else', 400);
            }

            $this->db->transStart();

            // Update request status
            $this->db->table('work_order_tool_requests')->where('id', $id)->update([
                'request_status' => 'ISSUED',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Update tool status
            $this->db->table('tools')->where('id', $request['tool_id'])->update([
                'availability_status' => 'ISSUED',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Create issue log (immutable audit)
            $issueLogData = [
                'plant_id' => $plantId,
                'tool_request_id' => $id,
                'tool_id' => $request['tool_id'],
                'issued_by' => $userId,
                'issued_to' => $request['requested_by'],
                'issue_date' => date('Y-m-d H:i:s'),
                'condition_on_issue' => $conditionOnIssue,
                'created_at' => date('Y-m-d H:i:s')
            ];
            $this->db->table('tool_issue_logs')->insert($issueLogData);

            $this->logAudit('tool_issued', 'work_order_tool_requests', $id, [
                'issued_by' => $userId,
                'issued_to' => $request['requested_by'],
                'tool_id' => $request['tool_id']
            ]);

            $this->db->transComplete();

            return $this->respond([
                'status' => 'success',
                'message' => 'Tool issued successfully'
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Tool issuance error: ' . $e->getMessage());
            return $this->fail('Failed to issue tool: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Step 4: Technician Marks Return
     * POST /api/v1/eam/tool-requests/{id}/mark-return
     */
    public function markReturn($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            if (is_object($plantIds)) {
                $plantIds = (array)$plantIds;
            }
            $plantId = is_array($plantIds) && !empty($plantIds) ? $plantIds[0] : null;
            if (!$plantId) {
                return $this->fail('No plant assigned', 403);
            }
            $userId = $GLOBALS['jwt_user_data']['id'] ?? null;

            $request = $this->db->table('work_order_tool_requests')
                ->where('id', $id)
                ->where('plant_id', $plantId)
                ->where('requested_by', $userId)
                ->get()->getRowArray();

            if (!$request) {
                return $this->fail('Tool request not found or not authorized', 404);
            }

            if ($request['request_status'] !== 'ISSUED') {
                return $this->fail('Tool is not currently issued', 400);
            }

            $this->db->transStart();

            $this->db->table('work_order_tool_requests')->where('id', $id)->update([
                'request_status' => 'RETURN_PENDING',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            $this->logAudit('tool_return_marked', 'work_order_tool_requests', $id, [
                'marked_by' => $userId
            ]);

            $this->db->transComplete();

            return $this->respond([
                'status' => 'success',
                'message' => 'Tool marked for return. Awaiting store verification.'
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Tool return marking error: ' . $e->getMessage());
            return $this->fail('Failed to mark tool return: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Step 5: Store Verifies Return
     * POST /api/v1/eam/tool-requests/{id}/verify-return
     */
    public function verifyReturn($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            if (is_object($plantIds)) {
                $plantIds = (array)$plantIds;
            }
            $plantId = is_array($plantIds) && !empty($plantIds) ? $plantIds[0] : null;
            if (!$plantId) {
                return $this->fail('No plant assigned', 403);
            }
            $userId = $GLOBALS['jwt_user_data']['id'] ?? null;

            $data = $this->request->getJSON(true);
            $conditionOnReturn = $data['condition_on_return'] ?? 'GOOD';
            $damageNotes = $data['damage_notes'] ?? null;
            $penaltyCost = $data['penalty_cost'] ?? 0.00;

            $request = $this->db->table('work_order_tool_requests')
                ->where('id', $id)
                ->where('plant_id', $plantId)
                ->get()->getRowArray();

            if (!$request) {
                return $this->fail('Tool request not found', 404);
            }

            if ($request['request_status'] !== 'RETURN_PENDING') {
                return $this->fail('Tool is not marked for return', 400);
            }

            $this->db->transStart();

            // Update request
            $this->db->table('work_order_tool_requests')->where('id', $id)->update([
                'request_status' => 'COMPLETED',
                'actual_return_date' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Update tool status
            $newToolStatus = ($conditionOnReturn === 'DAMAGED') ? 'MAINTENANCE' : 'AVAILABLE';
            $this->db->table('tools')->where('id', $request['tool_id'])->update([
                'availability_status' => $newToolStatus,
                'condition_status' => $conditionOnReturn,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Update issue log
            $issueLog = $this->db->table('tool_issue_logs')
                ->where('tool_request_id', $id)
                ->get()->getRowArray();

            if ($issueLog) {
                $this->db->table('tool_issue_logs')->where('id', $issueLog['id'])->update([
                    'return_received_by' => $userId,
                    'return_date' => date('Y-m-d H:i:s'),
                    'condition_on_return' => $conditionOnReturn,
                    'damage_notes' => $damageNotes,
                    'penalty_cost' => $penaltyCost
                ]);
            }

            $this->logAudit('tool_return_verified', 'work_order_tool_requests', $id, [
                'verified_by' => $userId,
                'condition' => $conditionOnReturn,
                'penalty_cost' => $penaltyCost
            ]);

            $this->db->transComplete();

            return $this->respond([
                'status' => 'success',
                'message' => 'Tool return verified successfully'
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Tool return verification error: ' . $e->getMessage());
            return $this->fail('Failed to verify tool return: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cancel request (by technician)
     * POST /api/v1/eam/tool-requests/{id}/cancel
     */
    public function cancel($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            if (is_object($plantIds)) {
                $plantIds = (array)$plantIds;
            }
            $plantId = is_array($plantIds) && !empty($plantIds) ? $plantIds[0] : null;
            if (!$plantId) {
                return $this->fail('No plant assigned', 403);
            }
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? $jwtData->user_id ?? null) : (is_array($jwtData) ? ($jwtData['id'] ?? $jwtData['user_id'] ?? null) : null);

            $request = $this->db->table('work_order_tool_requests')
                ->where('id', $id)
                ->where('plant_id', $plantId)
                ->where('requested_by', $userId)
                ->get()->getRowArray();

            if (!$request) {
                return $this->fail('Tool request not found or not authorized', 404);
            }

            if (!in_array($request['request_status'], ['PENDING', 'APPROVED'])) {
                return $this->fail('Cannot cancel request in current status', 400);
            }

            $this->db->transStart();

            $this->db->table('work_order_tool_requests')->where('id', $id)->update([
                'request_status' => 'CANCELLED',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Release tool
            $this->db->table('tools')->where('id', $request['tool_id'])->update([
                'availability_status' => 'AVAILABLE',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            $this->logAudit('tool_request_cancelled', 'work_order_tool_requests', $id, [
                'cancelled_by' => $userId
            ]);

            $this->db->transComplete();

            return $this->respond([
                'status' => 'success',
                'message' => 'Tool request cancelled successfully'
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Tool request cancellation error: ' . $e->getMessage());
            return $this->fail('Failed to cancel tool request: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get tool requests by work order
     * GET /api/v1/eam/work-orders/{id}/tool-requests
     */
    public function getByWorkOrder($workOrderId)
    {
        try {
            $plantIds = $this->getPlantIds();
            if (is_object($plantIds)) {
                $plantIds = (array)$plantIds;
            }
            $plantId = is_array($plantIds) && !empty($plantIds) ? $plantIds[0] : null;
            if (!$plantId) {
                return $this->fail('No plant assigned', 403);
            }

            $builder = $this->db->table('work_order_tool_requests tr');
            $builder->select('tr.*, t.tool_name, t.tool_code, t.category, t.condition_status, t.availability_status,
                             u1.username as requested_by_name, u2.username as approved_by_name');
            $builder->join('tools t', 't.id = tr.tool_id', 'left');
            $builder->join('users u1', 'u1.id = tr.requested_by', 'left');
            $builder->join('users u2', 'u2.id = tr.approved_by', 'left');
            $builder->where('tr.work_order_id', $workOrderId);
            $builder->where('tr.plant_id', $plantId);
            $builder->orderBy('tr.created_at', 'DESC');

            $requests = $builder->get()->getResultArray();

            return $this->respond([
                'status' => 'success',
                'data' => $requests
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Tool requests by work order fetch error: ' . $e->getMessage());
            return $this->fail('Failed to fetch tool requests: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get available tools
     * GET /api/v1/eam/tools
     */
    public function getTools()
    {
        try {
            $plantIds = $this->getPlantIds();
            if (is_object($plantIds)) {
                $plantIds = (array)$plantIds;
            }
            $plantId = is_array($plantIds) && !empty($plantIds) ? $plantIds[0] : null;
            if (!$plantId) {
                return $this->fail('No plant assigned', 403);
            }

            $workOrderId = $this->request->getGet('work_order_id');

            $builder = $this->db->table('tools');
            $builder->where('plant_id', $plantId);
            $builder->where('is_active', 1);
            $builder->orderBy('tool_name', 'ASC');

            $tools = $builder->get()->getResultArray();

            // Check if tools are pre-allocated to this work order
            if ($workOrderId) {
                foreach ($tools as &$tool) {
                    $reserved = $this->db->table('work_order_tool_requests')
                        ->where('work_order_id', $workOrderId)
                        ->where('tool_id', $tool['id'])
                        ->whereIn('request_status', ['PENDING', 'APPROVED', 'ISSUED'])
                        ->get()->getRowArray();
                    
                    $tool['is_pre_allocated'] = $reserved ? true : false;
                    $tool['allocation_status'] = $reserved ? $reserved['request_status'] : null;
                }
            }

            return $this->respond([
                'status' => 'success',
                'data' => $tools,
                'plant_id' => $plantId
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Tools fetch error: ' . $e->getMessage());
            return $this->fail('Failed to fetch tools: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Check if work order can be closed (no active tool requests)
     * GET /api/v1/eam/tool-requests/check-work-order/{workOrderId}
     */
    public function checkWorkOrderClosure($workOrderId)
    {
        try {
            $plantIds = $this->getPlantIds();
            if (is_object($plantIds)) {
                $plantIds = (array)$plantIds;
            }
            $plantId = is_array($plantIds) && !empty($plantIds) ? $plantIds[0] : null;
            if (!$plantId) {
                return $this->fail('No plant assigned', 403);
            }

            $activeRequests = $this->db->table('work_order_tool_requests')
                ->where('work_order_id', $workOrderId)
                ->where('plant_id', $plantId)
                ->whereIn('request_status', ['PENDING', 'APPROVED', 'ISSUED', 'RETURN_PENDING'])
                ->countAllResults();

            $canClose = $activeRequests === 0;

            return $this->respond([
                'status' => 'success',
                'can_close' => $canClose,
                'active_tool_requests' => $activeRequests,
                'message' => $canClose ? 'Work order can be closed' : 'Work order has active tool requests'
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Work order closure check error: ' . $e->getMessage());
            return $this->fail('Failed to check work order closure: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get tool issue logs (audit trail)
     * GET /api/v1/eam/tool-requests/{id}/logs
     */
    public function getLogs($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            if (is_object($plantIds)) {
                $plantIds = (array)$plantIds;
            }
            $plantId = is_array($plantIds) && !empty($plantIds) ? $plantIds[0] : null;
            if (!$plantId) {
                return $this->fail('No plant assigned', 403);
            }

            $logs = $this->db->table('tool_issue_logs til')
                ->select('til.*, t.tool_name, t.tool_code, 
                         u1.username as issued_by_name, u2.username as issued_to_name, u3.username as return_received_by_name')
                ->join('tools t', 't.id = til.tool_id', 'left')
                ->join('users u1', 'u1.id = til.issued_by', 'left')
                ->join('users u2', 'u2.id = til.issued_to', 'left')
                ->join('users u3', 'u3.id = til.return_received_by', 'left')
                ->where('til.tool_request_id', $id)
                ->where('til.plant_id', $plantId)
                ->get()->getResultArray();

            return $this->respond([
                'status' => 'success',
                'data' => $logs
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Tool logs fetch error: ' . $e->getMessage());
            return $this->fail('Failed to fetch tool logs: ' . $e->getMessage(), 500);
        }
    }

    private function logAudit($action, $table, $recordId, $details = [])
    {
        try {
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? $jwtData->user_id ?? null) : (is_array($jwtData) ? ($jwtData['id'] ?? $jwtData['user_id'] ?? null) : null);
            $plantIds = $this->getPlantIds();
            if (is_object($plantIds)) {
                $plantIds = (array)$plantIds;
            }
            $plantId = is_array($plantIds) && !empty($plantIds) ? $plantIds[0] : null;

            $this->db->table('audit_logs')->insert([
                'user_id' => $userId,
                'plant_id' => $plantId,
                'action' => $action,
                'table_name' => $table,
                'record_id' => $recordId,
                'details' => json_encode($details),
                'ip_address' => $this->request->getIPAddress(),
                'user_agent' => $this->request->getUserAgent()->getAgentString(),
                'created_at' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Audit log error: ' . $e->getMessage());
        }
    }
}
