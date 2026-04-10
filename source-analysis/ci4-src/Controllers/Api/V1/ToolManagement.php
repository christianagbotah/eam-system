<?php

namespace App\Controllers\API\V1;

use CodeIgniter\RESTful\ResourceController;
use App\Models\WorkOrderToolRequestModel;
use App\Models\ToolIssueLogModel;
use App\Models\ToolModel;
use App\Models\WorkOrderModel;

class ToolManagement extends ResourceController
{
    protected $modelName = 'App\Models\WorkOrderToolRequestModel';
    protected $format = 'json';

    // 1. Request Tool (Technician)
    public function requestTool()
    {
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            $data = $this->request->getJSON(true);
            $userId = $this->request->user_id ?? null;

            // Validate required fields
            if (!isset($data['work_order_id'], $data['tool_id'], $data['plant_id'])) {
                return $this->failValidationErrors('Missing required fields');
            }

            // Check if user is assigned to work order
            $workOrderModel = new WorkOrderModel();
            $workOrder = $workOrderModel->find($data['work_order_id']);
            
            if (!$workOrder || $workOrder['plant_id'] != $data['plant_id']) {
                return $this->failNotFound('Work order not found');
            }

            // Check tool availability
            $toolModel = new ToolModel();
            $tool = $toolModel->where('id', $data['tool_id'])
                              ->where('plant_id', $data['plant_id'])
                              ->first();

            if (!$tool) {
                return $this->failNotFound('Tool not found');
            }

            if ($tool['availability_status'] !== 'AVAILABLE') {
                return $this->fail('Tool is not available', 400);
            }

            // Check calibration if required
            if ($tool['is_calibrated'] && $tool['calibration_due_date']) {
                if (strtotime($tool['calibration_due_date']) < time()) {
                    return $this->fail('Tool calibration is overdue', 400);
                }
            }

            // Create request
            $requestData = [
                'plant_id' => $data['plant_id'],
                'work_order_id' => $data['work_order_id'],
                'requested_by' => $userId,
                'tool_id' => $data['tool_id'],
                'quantity' => $data['quantity'] ?? 1,
                'reason' => $data['reason'] ?? null,
                'request_status' => 'PENDING',
                'required_from_date' => $data['required_from_date'] ?? date('Y-m-d H:i:s'),
                'expected_return_date' => $data['expected_return_date'] ?? null,
            ];

            $requestModel = new WorkOrderToolRequestModel();
            $requestId = $requestModel->insert($requestData);

            // Reserve tool
            $toolModel->update($data['tool_id'], ['availability_status' => 'RESERVED']);

            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->fail('Failed to create tool request', 500);
            }

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Tool request created successfully',
                'request_id' => $requestId
            ]);

        } catch (\Exception $e) {
            $db->transRollback();
            return $this->fail($e->getMessage(), 500);
        }
    }

    // 2. Approve/Reject Request (Supervisor)
    public function approveRequest($requestId)
    {
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            $data = $this->request->getJSON(true);
            $userId = $this->request->user_id ?? null;
            $action = $data['action'] ?? null; // 'approve' or 'reject'

            $requestModel = new WorkOrderToolRequestModel();
            $request = $requestModel->find($requestId);

            if (!$request) {
                return $this->failNotFound('Request not found');
            }

            if ($request['request_status'] !== 'PENDING') {
                return $this->fail('Request is not in pending status', 400);
            }

            if ($action === 'approve') {
                $requestModel->update($requestId, [
                    'request_status' => 'APPROVED',
                    'approved_by' => $userId,
                    'approved_at' => date('Y-m-d H:i:s')
                ]);

                $message = 'Tool request approved';
            } elseif ($action === 'reject') {
                $requestModel->update($requestId, [
                    'request_status' => 'REJECTED',
                    'approved_by' => $userId,
                    'approved_at' => date('Y-m-d H:i:s'),
                    'rejected_reason' => $data['reason'] ?? 'Not specified'
                ]);

                // Release tool reservation
                $toolModel = new ToolModel();
                $toolModel->update($request['tool_id'], ['availability_status' => 'AVAILABLE']);

                $message = 'Tool request rejected';
            } else {
                return $this->failValidationErrors('Invalid action');
            }

            $db->transComplete();

            return $this->respond([
                'status' => 'success',
                'message' => $message
            ]);

        } catch (\Exception $e) {
            $db->transRollback();
            return $this->fail($e->getMessage(), 500);
        }
    }

    // 3. Issue Tool (Store/Tool Crib)
    public function issueTool($requestId)
    {
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            $data = $this->request->getJSON(true);
            $userId = $this->request->user_id ?? null;

            $requestModel = new WorkOrderToolRequestModel();
            $request = $requestModel->find($requestId);

            if (!$request) {
                return $this->failNotFound('Request not found');
            }

            if ($request['request_status'] !== 'APPROVED') {
                return $this->fail('Request must be approved before issuing', 400);
            }

            // Check tool availability
            $toolModel = new ToolModel();
            $tool = $toolModel->find($request['tool_id']);

            if ($tool['availability_status'] === 'ISSUED') {
                return $this->fail('Tool is already issued', 400);
            }

            // Update request status
            $requestModel->update($requestId, [
                'request_status' => 'ISSUED'
            ]);

            // Update tool status
            $toolModel->update($request['tool_id'], [
                'availability_status' => 'ISSUED'
            ]);

            // Create issue log
            $issueLogModel = new ToolIssueLogModel();
            $issueLogModel->insert([
                'plant_id' => $request['plant_id'],
                'tool_request_id' => $requestId,
                'tool_id' => $request['tool_id'],
                'issued_by' => $userId,
                'issued_to' => $request['requested_by'],
                'issue_date' => date('Y-m-d H:i:s'),
                'condition_on_issue' => $data['condition'] ?? 'GOOD'
            ]);

            $db->transComplete();

            return $this->respond([
                'status' => 'success',
                'message' => 'Tool issued successfully'
            ]);

        } catch (\Exception $e) {
            $db->transRollback();
            return $this->fail($e->getMessage(), 500);
        }
    }

    // 4. Mark Return (Technician)
    public function markReturn($requestId)
    {
        try {
            $requestModel = new WorkOrderToolRequestModel();
            $request = $requestModel->find($requestId);

            if (!$request) {
                return $this->failNotFound('Request not found');
            }

            if ($request['request_status'] !== 'ISSUED') {
                return $this->fail('Tool is not issued', 400);
            }

            $requestModel->update($requestId, [
                'request_status' => 'RETURN_PENDING'
            ]);

            return $this->respond([
                'status' => 'success',
                'message' => 'Tool marked for return. Awaiting store verification.'
            ]);

        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    // 5. Verify Return (Store)
    public function verifyReturn($requestId)
    {
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            $data = $this->request->getJSON(true);
            $userId = $this->request->user_id ?? null;

            $requestModel = new WorkOrderToolRequestModel();
            $request = $requestModel->find($requestId);

            if (!$request) {
                return $this->failNotFound('Request not found');
            }

            if ($request['request_status'] !== 'RETURN_PENDING') {
                return $this->fail('Tool is not marked for return', 400);
            }

            $condition = $data['condition'] ?? 'GOOD';
            $damageNotes = $data['damage_notes'] ?? null;
            $penaltyCost = $data['penalty_cost'] ?? 0;

            // Update request
            $requestModel->update($requestId, [
                'request_status' => 'COMPLETED',
                'actual_return_date' => date('Y-m-d H:i:s')
            ]);

            // Update issue log
            $issueLogModel = new ToolIssueLogModel();
            $issueLog = $issueLogModel->where('tool_request_id', $requestId)
                                      ->orderBy('id', 'DESC')
                                      ->first();

            if ($issueLog) {
                // Since logs are immutable, we need to update only return fields
                $db->table('tool_issue_logs')
                   ->where('id', $issueLog['id'])
                   ->update([
                       'return_received_by' => $userId,
                       'return_date' => date('Y-m-d H:i:s'),
                       'condition_on_return' => $condition,
                       'damage_notes' => $damageNotes,
                       'penalty_cost' => $penaltyCost
                   ]);
            }

            // Update tool status
            $toolModel = new ToolModel();
            $newToolStatus = ($condition === 'DAMAGED') ? 'MAINTENANCE' : 'AVAILABLE';
            $toolModel->update($request['tool_id'], [
                'availability_status' => $newToolStatus,
                'condition_status' => $condition
            ]);

            $db->transComplete();

            return $this->respond([
                'status' => 'success',
                'message' => 'Tool return verified successfully'
            ]);

        } catch (\Exception $e) {
            $db->transRollback();
            return $this->fail($e->getMessage(), 500);
        }
    }

    // Get requests for work order
    public function getWorkOrderRequests($workOrderId)
    {
        try {
            $plantId = $this->request->getGet('plant_id');
            
            if (!$plantId) {
                return $this->failValidationErrors('plant_id is required');
            }

            $requestModel = new WorkOrderToolRequestModel();
            $requests = $requestModel->getRequestsWithDetails($workOrderId, $plantId);

            return $this->respond([
                'status' => 'success',
                'data' => $requests
            ]);

        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    // Get overdue returns
    public function getOverdueReturns()
    {
        try {
            $plantId = $this->request->getGet('plant_id');
            
            if (!$plantId) {
                return $this->failValidationErrors('plant_id is required');
            }

            $requestModel = new WorkOrderToolRequestModel();
            $overdueRequests = $requestModel->getOverdueReturns($plantId);

            return $this->respond([
                'status' => 'success',
                'data' => $overdueRequests
            ]);

        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    // Get tool history
    public function getToolHistory($toolId)
    {
        try {
            $plantId = $this->request->getGet('plant_id');
            
            if (!$plantId) {
                return $this->failValidationErrors('plant_id is required');
            }

            $issueLogModel = new ToolIssueLogModel();
            $history = $issueLogModel->getToolHistory($toolId, $plantId);

            return $this->respond([
                'status' => 'success',
                'data' => $history
            ]);

        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    // Damage report
    public function getDamageReport()
    {
        try {
            $plantId = $this->request->getGet('plant_id');
            $startDate = $this->request->getGet('start_date');
            $endDate = $this->request->getGet('end_date');
            
            if (!$plantId) {
                return $this->failValidationErrors('plant_id is required');
            }

            $issueLogModel = new ToolIssueLogModel();
            $report = $issueLogModel->getDamageReport($plantId, $startDate, $endDate);

            return $this->respond([
                'status' => 'success',
                'data' => $report
            ]);

        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }
}
