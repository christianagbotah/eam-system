<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;
use App\Models\MaintenanceRequestModel;
use App\Models\WorkOrderModel;
use App\Services\MaintenanceWorkflowService;
use App\Services\MaintenanceWorkflowStateMachine;
use App\Services\RWOP\RwopStateMachineService;
use App\Services\RWOP\RwopApprovalService;

class MaintenanceRequestController extends BaseResourceController
{
    protected $format = 'json';

    public function index()
    {
        try {
            $model = new MaintenanceRequestModel();
            $userData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = $userData->user_id ?? $userData->id ?? null;
            $userRole = $userData->role ?? null;
            
            $builder = $model->builder()
                ->select('maintenance_requests.*, users.username as requested_by_name, users.email as requested_by_email, departments.department_name, machines.machine_name, assemblies.assembly_name, parts.part_name');
            
            // Role-based filtering
            if ($userRole === 'supervisor') {
                // Get subordinates
                $db = \Config\Database::connect();
                $subordinates = $db->table('users')
                    ->select('id')
                    ->where('supervisor_id', $userId)
                    ->get()
                    ->getResultArray();
                
                $subordinateIds = array_column($subordinates, 'id');
                
                if (!empty($subordinateIds)) {
                    $builder->whereIn('maintenance_requests.requested_by', $subordinateIds);
                } else {
                    $builder->where('1=0');
                }
            } elseif ($userRole === 'planner') {
                $builder->where('maintenance_requests.assigned_planner_id', $userId);
            } elseif ($userRole === 'operator' || $userRole === 'technician') {
                $builder->where('maintenance_requests.requested_by', $userId);
            }
            
            $builder->join('users', 'users.id = maintenance_requests.requested_by', 'left')
                    ->join('departments', 'departments.id = maintenance_requests.department_id', 'left')
                    ->join('machines', 'machines.id = maintenance_requests.asset_id', 'left')
                    ->join('assemblies', 'assemblies.id = maintenance_requests.assembly_id', 'left')
                    ->join('parts', 'parts.id = maintenance_requests.part_id', 'left');
            $requests = $builder->orderBy('maintenance_requests.created_at', 'DESC')->get()->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $requests
            ]);
        } catch (\Exception $e) {
            log_message('error', 'MaintenanceRequest index error: ' . $e->getMessage());
            return $this->fail('Database error: ' . $e->getMessage());
        }
    }

    public function create()
    {
        $model = new MaintenanceRequestModel();
        $data = $this->request->getJSON(true);
        
        // Decode JWT token directly from header
        $authHeader = $this->request->getHeaderLine('Authorization');
        if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        
        if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $this->fail('Authentication required', 401);
        }
        
        $token = $matches[1];
        $jwtHandler = new \App\Libraries\JWT\JWTHandler();
        $decoded = $jwtHandler->validateToken($token);
        
        if (!$decoded || !isset($decoded->data)) {
            return $this->fail('Invalid authentication token', 401);
        }
        
        $userId = $decoded->data->user_id ?? $decoded->data->id ?? null;
        $userRole = $decoded->data->role ?? null;
        
        if (!$userId) {
            return $this->fail('Authentication required', 401);
        }
        
        log_message('debug', 'Creating request - User ID: ' . $userId . ', Role: ' . $userRole);
        
        $db = \Config\Database::connect();
        
        // If admin/planner is creating request for someone else
        if (in_array($userRole, ['admin', 'planner']) && !empty($data['requested_by'])) {
            $requestedBy = $data['requested_by'];
            log_message('debug', 'Admin/Planner creating request for user: ' . $requestedBy);
        } else {
            $requestedBy = $userId;
        }
        
        // Get user details to populate department and supervisor
        $user = $db->table('users')->select('*')->where('id', $requestedBy)->get()->getRowArray();
        
        log_message('debug', 'User data retrieved: ' . json_encode($user));
        log_message('debug', 'User department_id type: ' . gettype($user['department_id'] ?? null) . ', value: ' . var_export($user['department_id'] ?? null, true));
        log_message('debug', 'User supervisor_id type: ' . gettype($user['supervisor_id'] ?? null) . ', value: ' . var_export($user['supervisor_id'] ?? null, true));
        
        // Set default values
        $data['requested_by'] = $requestedBy;
        $data['requested_date'] = date('Y-m-d H:i:s');
        $data['status'] = 'pending';
        $data['workflow_status'] = 'pending';
        
        // Set priority if not provided
        if (empty($data['priority'])) {
            $data['priority'] = 'medium';
        }
        
        // If admin/planner provided department_id, use it; otherwise use user's department
        if (in_array($userRole, ['admin', 'planner']) && !empty($data['department_id'])) {
            log_message('debug', 'Using provided department_id: ' . $data['department_id']);
            
            // Validate: if requested_by is specified, check if user belongs to department
            if (!empty($data['requested_by']) && $data['requested_by'] != $userId) {
                $targetUser = $db->table('users')->where('id', $data['requested_by'])->get()->getRowArray();
                if ($targetUser && $targetUser['department_id'] != $data['department_id']) {
                    log_message('warning', 'Department mismatch: User ' . $data['requested_by'] . ' belongs to dept ' . $targetUser['department_id'] . ' but request assigned to dept ' . $data['department_id']);
                }
            }
        } else if ($user && isset($user['department_id']) && !empty($user['department_id']) && $user['department_id'] !== '0' && $user['department_id'] !== 0) {
            $data['department_id'] = (int)$user['department_id'];
            log_message('debug', 'Using user department_id: ' . $data['department_id'] . ' (converted from ' . var_export($user['department_id'], true) . ')');
        } else {
            log_message('warning', 'No valid department_id found for user. User data: ' . json_encode($user));
        }
        
        // Auto-populate supervisor from user if not provided
        if (!isset($data['supervisor_id']) || $data['supervisor_id'] === null || $data['supervisor_id'] === '' || $data['supervisor_id'] === 0) {
            if ($user && isset($user['supervisor_id']) && $user['supervisor_id'] !== null && $user['supervisor_id'] !== '' && $user['supervisor_id'] != 0) {
                $data['supervisor_id'] = (int)$user['supervisor_id'];
                log_message('debug', 'Using user supervisor_id: ' . $data['supervisor_id'] . ' (converted from ' . var_export($user['supervisor_id'], true) . ')');
            } else if ($user && isset($user['department_id']) && $user['department_id'] !== null && $user['department_id'] != 0) {
                // If user doesn't have a supervisor, try to find a supervisor in their department
                $deptSupervisor = $db->table('users')
                    ->where('department_id', $user['department_id'])
                    ->where('role', 'supervisor')
                    ->get()
                    ->getRowArray();
                
                if ($deptSupervisor) {
                    $data['supervisor_id'] = (int)$deptSupervisor['id'];
                    log_message('debug', 'Using department supervisor_id: ' . $data['supervisor_id']);
                } else {
                    log_message('warning', 'No supervisor found for department: ' . $user['department_id']);
                }
            } else {
                log_message('warning', 'No supervisor_id found. User data: ' . json_encode($user));
            }
        }
        
        log_message('debug', 'Final department_id: ' . ($data['department_id'] ?? 'null') . ', supervisor_id: ' . ($data['supervisor_id'] ?? 'null') . ', priority: ' . ($data['priority'] ?? 'null'));

        // Clean data - only keep allowed fields
        $allowedFields = [
            'title', 'description', 'priority', 'machine_down_status', 'status', 'workflow_status',
            'asset_id', 'assembly_id', 'part_id', 'location',
            'requested_by', 'requested_date', 'department_id', 'supervisor_id',
            'assigned_planner_id', 'assigned_technician_id', 'item_type', 'asset_name', 'manual_item_description',
            'notes'
        ];
        
        $cleanData = [];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $cleanData[$field] = $data[$field];
            }
        }
        
        log_message('debug', 'Clean data to insert: ' . json_encode($cleanData));

        if ($model->insert($cleanData)) {
            $requestId = $model->getInsertID();
            
            // Log audit trail if created on behalf of another user
            if (in_array($userRole, ['admin', 'planner']) && $requestedBy != $userId) {
                $this->logAudit(
                    $userId,
                    'created_for_user',
                    'maintenance_request',
                    $requestId,
                    "Created maintenance request for User #$requestedBy" . ($user ? " ({$user['username']})" : '')
                );
            }
            
            // Send notification if created on behalf of another user
            if (in_array($userRole, ['admin', 'planner']) && $requestedBy != $userId) {
                $this->sendNotification(
                    $requestedBy,
                    'request_created_for_you',
                    'Maintenance Request Created',
                    "A maintenance request has been created on your behalf by " . ($userData->username ?? 'admin')
                );
            }
            
            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Maintenance request created successfully',
                'data' => ['id' => $requestId]
            ]);
        }

        return $this->fail($model->errors() ?: 'Failed to create request');
    }

    private function notifyDepartmentSupervisor($requestId, $requestData)
    {
        $db = \Config\Database::connect();
        
        // Find department supervisor
        $supervisor = $db->table('users')
            ->where('department_id', $requestData['department_id'])
            ->where('role', 'supervisor')
            ->get()
            ->getRowArray();
        
        if ($supervisor) {
            $db->table('maintenance_notifications')->insert([
                'user_id' => $supervisor['id'],
                'type' => 'new_request',
                'title' => 'New Maintenance Request',
                'message' => 'A new maintenance request has been submitted in your department',
                'request_id' => $requestId,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }

    public function uploadAttachment($id = null)
    {
        $request = (new MaintenanceRequestModel())->find($id);
        if (!$request) {
            return $this->failNotFound('Request not found');
        }

        $file = $this->request->getFile('file');
        if (!$file || !$file->isValid()) {
            return $this->fail('No valid file uploaded');
        }

        $uploadPath = WRITEPATH . 'uploads/maintenance_requests/';
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }

        $newName = $file->getRandomName();
        if ($file->move($uploadPath, $newName)) {
            $db = \Config\Database::connect();
            $attachmentId = $db->table('maintenance_attachments')->insert([
                'request_id' => $id,
                'file_name' => $file->getClientName(),
                'file_path' => $uploadPath . $newName,
                'file_type' => $file->getClientMimeType(),
                'file_size' => $file->getSize(),
                'uploaded_by' => $this->request->user_id ?? 1,
                'created_at' => date('Y-m-d H:i:s')
            ]);

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'File uploaded successfully',
                'data' => ['id' => $db->insertID(), 'filename' => $file->getClientName()]
            ]);
        }

        return $this->fail('Failed to upload file');
    }

    public function getAttachments($id = null)
    {
        $db = \Config\Database::connect();
        $attachments = $db->table('maintenance_attachments')
            ->where('request_id', $id)
            ->get()
            ->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data' => $attachments
        ]);
    }

    public function deleteAttachment($id = null)
    {
        $db = \Config\Database::connect();
        $attachment = $db->table('maintenance_attachments')->where('id', $id)->get()->getRowArray();
        
        if (!$attachment) {
            return $this->failNotFound('Attachment not found');
        }

        if (file_exists($attachment['file_path'])) {
            unlink($attachment['file_path']);
        }

        $db->table('maintenance_attachments')->delete(['id' => $id]);

        return $this->respondDeleted([
            'status' => 'success',
            'message' => 'Attachment deleted successfully'
        ]);
    }

    public function update($id = null)
    {
        $model = new MaintenanceRequestModel();
        $request = $model->find($id);
        
        if (!$request) {
            return $this->failNotFound('Request not found');
        }

        // Permission check based on workflow status
        $userData = ($GLOBALS['jwt_user_data'] ?? null);
        $userRole = $userData->role ?? null;
        $userId = $userData->user_id ?? null;
        
        // Closed requests cannot be modified
        if ($request['workflow_status'] === 'closed') {
            return $this->fail('Closed requests cannot be modified');
        }
        
        // Satisfactory requests can only be updated by admin, manager, or assigned planner
        if ($request['workflow_status'] === 'satisfactory') {
            $allowedRoles = ['admin', 'manager'];
            $isAssignedPlanner = ($request['assigned_planner_id'] == $userId);
            
            if (!in_array($userRole, $allowedRoles) && !$isAssignedPlanner) {
                return $this->fail('Only admin, manager, or assigned planner can update requests marked as satisfactory');
            }
        }
        
        // Completed requests can be updated by supervisor (for verification) or planner
        if ($request['workflow_status'] === 'completed') {
            $allowedRoles = ['admin', 'manager', 'supervisor'];
            $isAssignedPlanner = ($request['assigned_planner_id'] == $userId);
            $isSupervisor = ($request['supervisor_id'] == $userId);
            
            if (!in_array($userRole, $allowedRoles) && !$isAssignedPlanner && !$isSupervisor) {
                return $this->fail('Only supervisor, planner, or admin can update completed requests');
            }
        }

        $data = $this->request->getJSON(true);
        $data['updated_at'] = date('Y-m-d H:i:s');

        if ($model->update($id, $data)) {
            return $this->respond([
                'status' => 'success',
                'message' => 'Request updated successfully',
                'data' => $model->find($id)
            ]);
        }

        return $this->fail($model->errors() ?: 'Failed to update request');
    }

    public function delete($id = null)
    {
        $model = new MaintenanceRequestModel();
        $request = $model->find($id);
        
        if (!$request) {
            return $this->failNotFound('Request not found');
        }

        // Prevent deletion of closed requests
        if ($request['workflow_status'] === 'closed') {
            return $this->fail('Closed requests cannot be deleted');
        }

        if ($model->delete($id)) {
            return $this->respondDeleted([
                'status' => 'success',
                'message' => 'Request deleted successfully'
            ]);
        }

        return $this->fail('Failed to delete request');
    }

    public function bulkDelete()
    {
        $model = new MaintenanceRequestModel();
        $data = $this->request->getJSON(true);
        $ids = $data['ids'] ?? [];

        if (empty($ids)) {
            return $this->fail('No IDs provided');
        }

        $deleted = 0;
        foreach ($ids as $id) {
            if ($model->delete($id)) {
                $deleted++;
            }
        }

        return $this->respond([
            'status' => 'success',
            'message' => "$deleted request(s) deleted successfully",
            'data' => ['deleted' => $deleted]
        ]);
    }

    public function bulkUpdateStatus()
    {
        $model = new MaintenanceRequestModel();
        $data = $this->request->getJSON(true);
        $ids = $data['ids'] ?? [];
        $status = $data['status'] ?? '';

        if (empty($ids) || empty($status)) {
            return $this->fail('IDs and status are required');
        }

        $updated = 0;
        foreach ($ids as $id) {
            if ($model->update($id, ['status' => $status, 'updated_at' => date('Y-m-d H:i:s')])) {
                $updated++;
            }
        }

        return $this->respond([
            'status' => 'success',
            'message' => "$updated request(s) updated successfully",
            'data' => ['updated' => $updated]
        ]);
    }

    public function export()
    {
        $model = new MaintenanceRequestModel();
        $format = $this->request->getGet('format') ?? 'csv';
        
        $requests = $model->select('maintenance_requests.*, users.username as requested_by_name, 
                                   machines.machine_name, departments.department_name')
                        ->join('users', 'users.id = maintenance_requests.requested_by', 'left')
                        ->join('machines', 'machines.id = maintenance_requests.asset_id', 'left')
                        ->join('departments', 'departments.id = maintenance_requests.department_id', 'left')
                        ->orderBy('maintenance_requests.created_at', 'DESC')
                        ->findAll();

        if ($format === 'csv') {
            return $this->exportCSV($requests);
        }

        return $this->respond([
            'status' => 'success',
            'data' => $requests
        ]);
    }

    private function exportCSV($data)
    {
        $filename = 'maintenance_requests_' . date('Y-m-d_His') . '.csv';
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        $output = fopen('php://output', 'w');
        
        if (!empty($data)) {
            fputcsv($output, array_keys($data[0]));
            foreach ($data as $row) {
                fputcsv($output, $row);
            }
        }
        
        fclose($output);
        exit;
    }

    public function approve($id)
    {
        try {
            $model = new MaintenanceRequestModel();
            $request = $model->find($id);
            
            if (!$request) {
                return $this->failNotFound('Request not found');
            }

            // Use RWOP enterprise services
            $userData = ($GLOBALS['jwt_user_data'] ?? null);
            $userId = $userData->user_id ?? 1;
            $userRole = $userData->role ?? 'supervisor';
            
            $approvalService = new RwopApprovalService();
            $requiredApprovals = $approvalService->checkApprovalRequired('maintenance_request', $id, $request);
            
            if (!empty($requiredApprovals)) {
                $approvalService->createApprovals('maintenance_request', $id, $requiredApprovals);
            }

            $currentState = $request['workflow_status'];
            $newState = MaintenanceWorkflowStateMachine::STATE_APPROVED;
            
            // Validate transition
            if (!MaintenanceWorkflowStateMachine::canTransition($currentState, $newState)) {
                return $this->fail("Cannot approve from current state: {$currentState}");
            }
            
            // Record transition
            MaintenanceWorkflowStateMachine::transition($id, $currentState, $newState, $userId, 'Approved by supervisor');
            
            $data = [
                'workflow_status' => $newState,
                'reviewed_by' => $userId,
                'reviewed_at' => date('Y-m-d H:i:s'),
                'status' => 'approved'
            ];

            if ($model->update($id, $data)) {
                return $this->respond([
                    'status' => 'success',
                    'message' => 'Request approved successfully'
                ]);
            }

            return $this->fail($model->errors() ?: 'Failed to approve request');
        } catch (\Exception $e) {
            log_message('error', 'Approve error: ' . $e->getMessage());
            return $this->fail('Error: ' . $e->getMessage());
        }
    }

    public function assignToPlanner($id)
    {
        try {
            $model = new MaintenanceRequestModel();
            $request = $model->find($id);
            
            if (!$request) {
                return $this->failNotFound('Request not found');
            }

            $currentState = $request['workflow_status'];
            $newState = MaintenanceWorkflowStateMachine::STATE_ASSIGNED_TO_PLANNER;
            
            // Validate transition
            if (!MaintenanceWorkflowStateMachine::canTransition($currentState, $newState)) {
                return $this->fail("Cannot assign to planner from current state: {$currentState}");
            }

            $data = $this->request->getJSON(true);
            $userData = ($GLOBALS['jwt_user_data'] ?? null);
            $userId = $userData->user_id ?? 1; // Default to user ID 1 for development
            
            // Record transition
            MaintenanceWorkflowStateMachine::transition($id, $currentState, $newState, $userId, 'Assigned to planner');
            
            $updateData = [
                'assigned_planner_id' => $data['planner_id'],
                'planner_type' => $data['planner_type'] ?? 'engineering',
                'review_notes' => $data['notes'] ?? '',
                'workflow_status' => $newState,
                'updated_at' => date('Y-m-d H:i:s')
            ];

            if ($model->update($id, $updateData)) {
                return $this->respond([
                    'status' => 'success',
                    'message' => 'Request assigned to planner successfully'
                ]);
            }

            return $this->fail('Failed to assign request');
        } catch (\Exception $e) {
            log_message('error', 'assignToPlanner error: ' . $e->getMessage());
            return $this->fail('Error: ' . $e->getMessage());
        }
    }

    public function reject($id)
    {
        $model = new MaintenanceRequestModel();
        $request = $model->find($id);
        
        if (!$request) {
            return $this->failNotFound('Request not found');
        }

        $userData = ($GLOBALS['jwt_user_data'] ?? null);
        $userId = $userData->user_id ?? null;
        $reason = $this->request->getJSON()->reason ?? 'Not specified';
        
        $data = [
            'workflow_status' => 'rejected',
            'reviewed_by' => $userId,
            'reviewed_at' => date('Y-m-d H:i:s'),
            'rejection_reason' => $reason,
            'status' => 'rejected'
        ];

        if ($model->update($id, $data)) {
            return $this->respond([
                'status' => 'success',
                'message' => 'Request rejected'
            ]);
        }

        return $this->fail('Failed to reject request');
    }

    public function dashboard()
    {
        $model = new MaintenanceRequestModel();
        $userId = $this->request->getGet('user_id');
        $db = \Config\Database::connect();
        
        $stats = [
            'total' => $model->countAll(),
            'pending' => $model->where('status', 'pending')->countAllResults(false),
            'approved' => $model->where('status', 'approved')->countAllResults(false),
            'rejected' => $model->where('status', 'rejected')->countAllResults(false),
            'converted' => $model->where('status', 'converted')->countAllResults(false),
            'overdue_sla' => $model->where('sla_status', 'overdue')->countAllResults(false),
            'at_risk_sla' => $model->where('sla_status', 'at_risk')->countAllResults(false),
        ];

        if ($userId) {
            $stats['my_requests'] = $model->where('requested_by', $userId)->countAllResults();
        }
        
        // Priority breakdown
        $stats['by_priority'] = [
            'urgent' => $model->where('priority', 'urgent')->countAllResults(false),
            'high' => $model->where('priority', 'high')->countAllResults(false),
            'medium' => $model->where('priority', 'medium')->countAllResults(false),
            'low' => $model->where('priority', 'low')->countAllResults(false),
        ];
        
        // Workflow status breakdown
        $stats['by_workflow'] = $db->table('maintenance_requests')
            ->select('workflow_status, COUNT(*) as count')
            ->groupBy('workflow_status')
            ->get()
            ->getResultArray();
        
        // Average response time
        $avgResponse = $db->table('maintenance_requests')
            ->selectAvg('response_time')
            ->where('response_time IS NOT NULL')
            ->get()
            ->getRowArray();
        $stats['avg_response_time'] = round($avgResponse['response_time'] ?? 0, 2);
        
        // Average resolution time
        $avgResolution = $db->table('maintenance_requests')
            ->selectAvg('resolution_time')
            ->where('resolution_time IS NOT NULL')
            ->get()
            ->getRowArray();
        $stats['avg_resolution_time'] = round($avgResolution['resolution_time'] ?? 0, 2);

        return $this->respond([
            'status' => 'success',
            'data' => $stats
        ]);
    }

    public function addComment($id = null)
    {
        $request = (new MaintenanceRequestModel())->find($id);
        if (!$request) {
            return $this->failNotFound('Request not found');
        }

        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $commentId = $db->table('maintenance_comments')->insert([
            'request_id' => $id,
            'user_id' => $this->request->user_id ?? 1,
            'comment' => $data['comment'] ?? '',
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Comment added successfully',
            'data' => ['id' => $db->insertID()]
        ]);
    }

    public function getComments($id = null)
    {
        $db = \Config\Database::connect();
        $comments = $db->table('maintenance_comments')
            ->select('maintenance_comments.*, users.username, users.email')
            ->join('users', 'users.id = maintenance_comments.user_id', 'left')
            ->where('request_id', $id)
            ->orderBy('created_at', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data' => $comments
        ]);
    }

    private function sendNotification($userId, $type, $title, $message)
    {
        $db = \Config\Database::connect();
        try {
            $db->table('maintenance_notifications')->insert([
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Notification insert failed: ' . $e->getMessage());
        }
    }
    
    private function logAudit($userId, $action, $entityType, $entityId, $details)
    {
        $db = \Config\Database::connect();
        try {
            $db->table('audit_logs')->insert([
                'user_id' => $userId,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'details' => $details,
                'ip_address' => $this->request->getIPAddress(),
                'user_agent' => $this->request->getUserAgent()->getAgentString(),
                'created_at' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Audit log insert failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Convert request to work order with technician assignment
     */
    public function createWorkOrder($id = null)
    {
        try {
            $model = new MaintenanceRequestModel();
            $request = $model->find($id);
            
            if (!$request) {
                return $this->failNotFound('Request not found');
            }
            
            $userData = ($GLOBALS['jwt_user_data'] ?? null);
            $userId = $userData->user_id ?? 1;
            $userRole = $userData->role ?? 'planner';
            
            // Use RWOP state machine validation
            $stateMachine = new RwopStateMachineService();
            $validation = $stateMachine->validateTransition('maintenance_request', $request['status'], 'converted', $userRole);
            
            if (!$validation['valid']) {
                return $this->fail($validation['error']);
            }
            
            $currentState = $request['workflow_status'];
            $newState = MaintenanceWorkflowStateMachine::STATE_WORK_ORDER_CREATED;
            
            // Validate transition
            if (!MaintenanceWorkflowStateMachine::canTransition($currentState, $newState)) {
                log_message('error', 'createWorkOrder: Invalid transition from ' . $currentState . ' to ' . $newState);
                return $this->fail("Cannot create work order from current state: {$currentState}");
            }

            $data = $this->request->getJSON(true);
            log_message('debug', 'createWorkOrder received data: ' . json_encode($data));
            
            // Validate technician assignment - handle both single and array formats
            $technicianId = null;
            if (!empty($data['technician_id'])) {
                $technicianId = $data['technician_id'];
            } elseif (!empty($data['technicians']) && is_array($data['technicians']) && count($data['technicians']) > 0) {
                $technicianId = $data['technicians'][0]['technician_id'] ?? null;
            }
            
            if (empty($technicianId)) {
                log_message('error', 'createWorkOrder: Missing technician_id in request data');
                return $this->fail('Technician assignment is required');
            }
            
            // Create work order
            $db = \Config\Database::connect();
            
            // Get plant_id from request or user
            $plantId = $request['plant_id'] ?? null;
            if (!$plantId && !empty($request['asset_id'])) {
                // Get plant_id from asset
                $asset = $db->table('assets_unified')->select('plant_id')->where('id', $request['asset_id'])->get()->getRowArray();
                $plantId = $asset['plant_id'] ?? null;
            }
            
            $woData = [
                'work_order_number' => $this->generateWorkOrderNumber(),
                'request_id' => $id,
                'title' => $request['title'],
                'description' => $request['description'],
                'priority' => $request['priority'],
                'asset_id' => $request['asset_id'],
                'department_id' => $request['department_id'],
                'plant_id' => $plantId,
                'location' => $request['location'] ?? null,
                'assigned_to' => $technicianId,
                'assigned_user_id' => $technicianId,
                'type' => $data['work_order_type'] ?? $data['work_type'] ?? 'corrective',
                'work_order_type' => $data['work_order_type'] ?? $data['work_type'] ?? 'corrective',
                'is_breakdown' => $data['is_breakdown'] ?? false,
                'status' => 'assigned',
                'estimated_hours' => $data['estimated_hours'] ?? null,
                'planned_start' => $data['planned_start'] ?? $data['scheduled_date'] ?? null,
                'planned_end' => $data['planned_end'] ?? null,
                'technical_description' => $data['technical_description'] ?? null,
                'trade_activity' => $data['trade_activity'] ?? null,
                'delivery_date_required' => !empty($data['delivery_date_required']) ? $data['delivery_date_required'] : null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            $db->table('work_orders')->insert($woData);
            $workOrderId = $db->insertID();
            
            // Insert team members
            if (!empty($data['technicians']) && is_array($data['technicians'])) {
                foreach ($data['technicians'] as $tech) {
                    $db->table('work_order_team_members')->insert([
                        'work_order_id' => $workOrderId,
                        'technician_id' => $tech['technician_id'] ?? $tech['id'],
                        'role' => $tech['role'] ?? 'member',
                        'created_at' => date('Y-m-d H:i:s')
                    ]);
                }
            }
            
            // Insert required parts
            if (!empty($data['required_parts']) && is_array($data['required_parts'])) {
                foreach ($data['required_parts'] as $partId) {
                    // Handle both array of IDs and array of objects
                    $actualPartId = is_array($partId) ? ($partId['part_id'] ?? $partId['id'] ?? $partId) : $partId;
                    
                    $db->table('work_order_materials')->insert([
                        'work_order_id' => $workOrderId,
                        'inventory_item_id' => 0,
                        'part_id' => $actualPartId,
                        'quantity_required' => 1,
                        'created_at' => date('Y-m-d H:i:s')
                    ]);
                }
            }
            
            // Insert required tools
            if (!empty($data['required_tools']) && is_array($data['required_tools'])) {
                foreach ($data['required_tools'] as $toolId) {
                    // Handle both array of IDs and array of objects
                    $actualToolId = is_array($toolId) ? ($toolId['tool_id'] ?? $toolId['id'] ?? $toolId) : $toolId;
                    
                    $db->table('tool_assignments')->insert([
                        'tool_id' => $actualToolId,
                        'work_order_id' => $workOrderId,
                        'quantity' => 1,
                        'created_at' => date('Y-m-d H:i:s')
                    ]);
                }
            }
            
            // Set team leader if specified
            if (!empty($data['team_leader_id'])) {
                $db->table('work_orders')->where('id', $workOrderId)->update([
                    'team_leader_id' => $data['team_leader_id']
                ]);
            }
            
            // Update work order with PPE and safety notes
            if (!empty($data['ppe_required']) || !empty($data['safety_notes'])) {
                $updateData = [];
                if (!empty($data['ppe_required'])) $updateData['ppe_required'] = $data['ppe_required'];
                if (!empty($data['safety_notes'])) $updateData['safety_notes'] = $data['safety_notes'];
                if (!empty($updateData)) {
                    $db->table('work_orders')->where('id', $workOrderId)->update($updateData);
                }
            }
            
            // Record transition
            MaintenanceWorkflowStateMachine::transition($id, $currentState, $newState, $userId, 'Work order created and assigned to technician');
            
            // Update request
            $model->update($id, [
                'work_order_id' => $workOrderId,
                'workflow_status' => $newState,
                'status' => 'converted',
                'assigned_technician_id' => $technicianId
            ]);
            
            // Send notification to technician
            $this->sendNotification(
                $technicianId,
                'work_order_assigned',
                'New Work Order Assigned',
                "Work order {$woData['work_order_number']} has been assigned to you"
            );
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Work order created and assigned successfully',
                'data' => [
                    'work_order_id' => $workOrderId,
                    'work_order_number' => $woData['work_order_number'],
                    'assigned_technician_id' => $technicianId
                ]
            ]);
        } catch (\Exception $e) {
            log_message('error', 'createWorkOrder error: ' . $e->getMessage());
            log_message('error', 'createWorkOrder trace: ' . $e->getTraceAsString());
            return $this->fail('Failed to create work order: ' . $e->getMessage());
        }
    }
    
    private function generateWorkOrderNumber()
    {
        $prefix = 'WO';
        $year = date('Y');
        $month = date('m');
        
        $db = \Config\Database::connect();
        $lastWO = $db->table('work_orders')
            ->select('work_order_number')
            ->like('work_order_number', $prefix . $year . $month, 'after')
            ->orderBy('id', 'DESC')
            ->get()
            ->getRowArray();
        
        if ($lastWO && !empty($lastWO['work_order_number'])) {
            $lastNumber = (int)substr($lastWO['work_order_number'], -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . $year . $month . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }
    
    /**
     * Get workflow history for a request
     */
    public function getWorkflow($id = null)
    {
        $workflow = new MaintenanceWorkflowService();
        $history = $workflow->getWorkflowHistory($id);
        
        return $this->respond([
            'status' => 'success',
            'data' => $history
        ]);
    }
    
    /**
     * Get role-based queue
     */
    public function myQueue()
    {
        try {
            $model = new MaintenanceRequestModel();
            
            // Get user ID by decoding JWT token directly
            $userId = $this->getUserIdFromToken();
            $role = $this->request->getGet('role') ?? 'operator';
            
            log_message('debug', 'myQueue called - userId: ' . $userId . ', role: ' . $role);
            
            $builder = $model->builder()
                ->select('maintenance_requests.*, users.username as requested_by_name, users.email as requested_by_email, departments.department_name, machines.machine_name, assemblies.assembly_name, parts.part_name')
                ->join('users', 'users.id = maintenance_requests.requested_by', 'left')
                ->join('departments', 'departments.id = maintenance_requests.department_id', 'left')
                ->join('machines', 'machines.id = maintenance_requests.asset_id', 'left')
                ->join('assemblies', 'assemblies.id = maintenance_requests.assembly_id', 'left')
                ->join('parts', 'parts.id = maintenance_requests.part_id', 'left')
                ->where('maintenance_requests.workflow_status !=', 'closed');
            
            switch ($role) {
                case 'supervisor':
                    // Get subordinates
                    $db = \Config\Database::connect();
                    $subordinates = $db->table('users')
                        ->select('id')
                        ->where('supervisor_id', $userId)
                        ->get()
                        ->getResultArray();
                    
                    $subordinateIds = array_column($subordinates, 'id');
                    log_message('debug', 'Supervisor subordinates: ' . json_encode($subordinateIds));
                    
                    if (!empty($subordinateIds)) {
                        $builder->whereIn('maintenance_requests.requested_by', $subordinateIds);
                    } else {
                        $builder->where('1=0'); // No subordinates
                    }
                    break;
                case 'planner':
                    log_message('debug', 'Planner case - userId: ' . $userId . ' (type: ' . gettype($userId) . ')');
                    // Check all requests with assigned_planner_id first
                    $db = \Config\Database::connect();
                    $allRequests = $db->table('maintenance_requests')
                        ->select('id, assigned_planner_id, workflow_status')
                        ->where('workflow_status !=', 'closed')
                        ->get()
                        ->getResultArray();
                    log_message('debug', 'All non-closed requests: ' . json_encode($allRequests));
                    
                    $builder->where('maintenance_requests.assigned_planner_id', $userId);
                    log_message('debug', 'Planner filtering by assigned_planner_id: ' . $userId);
                    break;
                case 'operator':
                case 'technician':
                    $builder->where('maintenance_requests.requested_by', $userId);
                    break;
                default:
                    // Admin sees all
                    break;
            }
            
            $requests = $builder->orderBy('maintenance_requests.created_at', 'DESC')->get()->getResultArray();
            log_message('debug', 'myQueue returning ' . count($requests) . ' requests for role: ' . $role);
            
            return $this->respond([
                'status' => 'success',
                'data' => $requests
            ]);
        } catch (\Exception $e) {
            log_message('error', 'myQueue error: ' . $e->getMessage());
            return $this->fail('Error: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Advanced filtering with date range, priority, status, SLA
     */
    public function filter()
    {
        $model = new MaintenanceRequestModel();
        $builder = $model->builder();
        
        // Date range filter
        if ($startDate = $this->request->getGet('start_date')) {
            $builder->where('created_at >=', $startDate);
        }
        if ($endDate = $this->request->getGet('end_date')) {
            $builder->where('created_at <=', $endDate);
        }
        
        // Priority filter
        if ($priority = $this->request->getGet('priority')) {
            $builder->where('priority', $priority);
        }
        
        // Status filter
        if ($status = $this->request->getGet('status')) {
            $builder->where('status', $status);
        }
        
        // Workflow status filter
        if ($workflowStatus = $this->request->getGet('workflow_status')) {
            $builder->where('workflow_status', $workflowStatus);
        }
        
        // SLA status filter
        if ($slaStatus = $this->request->getGet('sla_status')) {
            $builder->where('sla_status', $slaStatus);
        }
        
        // Department filter
        if ($departmentId = $this->request->getGet('department_id')) {
            $builder->where('department_id', $departmentId);
        }
        
        // Machine filter
        if ($machineId = $this->request->getGet('asset_id')) {
            $builder->where('asset_id', $machineId);
        }
        
        $requests = $builder->orderBy('created_at', 'DESC')->get()->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $requests,
            'count' => count($requests)
        ]);
    }
    
    /**
     * Bulk approve requests
     */
    public function bulkApprove()
    {
        $data = $this->request->getJSON(true);
        $ids = $data['ids'] ?? [];
        $userId = $this->request->user_id ?? 1;
        $workflow = new MaintenanceWorkflowService();
        
        if (empty($ids)) {
            return $this->fail('No IDs provided');
        }
        
        $model = new MaintenanceRequestModel();
        $approved = 0;
        
        foreach ($ids as $id) {
            $request = $model->find($id);
            if ($request && $request['workflow_status'] === 'pending') {
                if ($model->update($id, [
                    'workflow_status' => 'approved',
                    'reviewed_by' => $userId,
                    'reviewed_at' => date('Y-m-d H:i:s'),
                    'status' => 'approved'
                ])) {
                    $workflow->recordWorkflowAction($id, 'pending', 'approved', $userId, 'approved', 'Bulk approved');
                    $workflow->sendNotification($request['requested_by'], $id, 'request_approved', 'Request Approved', 'Your request has been approved');
                    $approved++;
                }
            }
        }
        
        return $this->respond([
            'status' => 'success',
            'message' => "$approved request(s) approved",
            'data' => ['approved' => $approved]
        ]);
    }
    
    /**
     * Bulk reject requests
     */
    public function bulkReject()
    {
        $data = $this->request->getJSON(true);
        $ids = $data['ids'] ?? [];
        $reason = $data['reason'] ?? 'Bulk rejection';
        $userId = $this->request->user_id ?? 1;
        $workflow = new MaintenanceWorkflowService();
        
        if (empty($ids)) {
            return $this->fail('No IDs provided');
        }
        
        $model = new MaintenanceRequestModel();
        $rejected = 0;
        
        foreach ($ids as $id) {
            $request = $model->find($id);
            if ($request && $request['workflow_status'] === 'pending') {
                if ($model->update($id, [
                    'workflow_status' => 'rejected',
                    'reviewed_by' => $userId,
                    'reviewed_at' => date('Y-m-d H:i:s'),
                    'rejection_reason' => $reason,
                    'status' => 'rejected'
                ])) {
                    $workflow->recordWorkflowAction($id, 'pending', 'rejected', $userId, 'rejected', $reason);
                    $workflow->sendNotification($request['requested_by'], $id, 'request_rejected', 'Request Rejected', 'Your request has been rejected: ' . $reason);
                    $rejected++;
                }
            }
        }
        
        return $this->respond([
            'status' => 'success',
            'message' => "$rejected request(s) rejected",
            'data' => ['rejected' => $rejected]
        ]);
    }
    
    /**
     * Analytics report
     */
    public function analytics()
    {
        $db = \Config\Database::connect();
        $startDate = $this->request->getGet('start_date') ?? date('Y-m-01');
        $endDate = $this->request->getGet('end_date') ?? date('Y-m-d');
        
        // Requests by priority over time
        $byPriority = $db->table('maintenance_requests')
            ->select('priority, COUNT(*) as count')
            ->where('created_at >=', $startDate)
            ->where('created_at <=', $endDate)
            ->groupBy('priority')
            ->get()
            ->getResultArray();
        
        // Requests by status
        $byStatus = $db->table('maintenance_requests')
            ->select('status, COUNT(*) as count')
            ->where('created_at >=', $startDate)
            ->where('created_at <=', $endDate)
            ->groupBy('status')
            ->get()
            ->getResultArray();
        
        // SLA compliance
        $slaCompliance = $db->table('maintenance_requests')
            ->select('sla_status, COUNT(*) as count')
            ->where('created_at >=', $startDate)
            ->where('created_at <=', $endDate)
            ->groupBy('sla_status')
            ->get()
            ->getResultArray();
        
        // Top machines with most requests
        $topMachines = $db->table('maintenance_requests mr')
            ->select('m.machine_name, COUNT(*) as count')
            ->join('machines m', 'm.id = mr.asset_id', 'left')
            ->where('mr.created_at >=', $startDate)
            ->where('mr.created_at <=', $endDate)
            ->where('mr.asset_id IS NOT NULL')
            ->groupBy('mr.asset_id')
            ->orderBy('count', 'DESC')
            ->limit(10)
            ->get()
            ->getResultArray();
        
        // Requests trend (daily)
        $trend = $db->table('maintenance_requests')
            ->select('DATE(created_at) as date, COUNT(*) as count')
            ->where('created_at >=', $startDate)
            ->where('created_at <=', $endDate)
            ->groupBy('DATE(created_at)')
            ->orderBy('date', 'ASC')
            ->get()
            ->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => [
                'by_priority' => $byPriority,
                'by_status' => $byStatus,
                'sla_compliance' => $slaCompliance,
                'top_machines' => $topMachines,
                'trend' => $trend,
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate
                ]
            ]
        ]);
    }
    
    /**
     * Get archived (closed) requests
     */
    public function archive()
    {
        try {
            $model = new MaintenanceRequestModel();
            $userData = ($GLOBALS['jwt_user_data'] ?? null);
            $userId = $userData->user_id ?? null;
            $userRole = $userData->role ?? null;
            
            $builder = $model->builder()
                ->select('maintenance_requests.*, users.username as requested_by_name, users.email as requested_by_email, departments.department_name, machines.machine_name, assemblies.assembly_name, parts.part_name')
                ->join('users', 'users.id = maintenance_requests.requested_by', 'left')
                ->join('departments', 'departments.id = maintenance_requests.department_id', 'left')
                ->join('machines', 'machines.id = maintenance_requests.asset_id', 'left')
                ->join('assemblies', 'assemblies.id = maintenance_requests.assembly_id', 'left')
                ->join('parts', 'parts.id = maintenance_requests.part_id', 'left')
                ->where('maintenance_requests.workflow_status', 'closed');
            
            // Role-based filtering for archive
            if ($userRole === 'supervisor') {
                $db = \Config\Database::connect();
                $subordinates = $db->table('users')
                    ->select('id')
                    ->where('supervisor_id', $userId)
                    ->get()
                    ->getResultArray();
                
                $subordinateIds = array_column($subordinates, 'id');
                if (!empty($subordinateIds)) {
                    $builder->whereIn('maintenance_requests.requested_by', $subordinateIds);
                } else {
                    $builder->where('1=0');
                }
            } elseif ($userRole === 'planner') {
                $builder->where('maintenance_requests.assigned_planner_id', $userId);
            } elseif ($userRole === 'operator' || $userRole === 'technician') {
                $builder->where('maintenance_requests.requested_by', $userId);
            }
            
            $requests = $builder->orderBy('maintenance_requests.closed_at', 'DESC')->get()->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $requests
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Archive error: ' . $e->getMessage());
            return $this->fail('Error: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get notifications for user
     */
    public function getNotifications()
    {
        $userId = $this->request->user_id ?? 1;
        $unreadOnly = $this->request->getGet('unread_only') === 'true';
        
        $db = \Config\Database::connect();
        $builder = $db->table('maintenance_notifications')
            ->where('user_id', $userId)
            ->orderBy('created_at', 'DESC')
            ->limit(50);
        
        if ($unreadOnly) {
            $builder->where('is_read', false);
        }
        
        $notifications = $builder->get()->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $notifications
        ]);
    }
    
    /**
     * Mark notification as read
     */
    public function markCompleted($id)
    {
        try {
            $model = new MaintenanceRequestModel();
            $request = $model->find($id);
            
            if (!$request) {
                return $this->failNotFound('Request not found');
            }

            $currentState = $request['workflow_status'];
            $newState = MaintenanceWorkflowStateMachine::STATE_COMPLETED;
            
            // Validate transition
            if (!MaintenanceWorkflowStateMachine::canTransition($currentState, $newState)) {
                return $this->fail("Cannot mark as completed from current state: {$currentState}");
            }

            $userData = ($GLOBALS['jwt_user_data'] ?? null);
            $userId = $userData->user_id ?? 1; // Default to user ID 1 for development
            
            // Record transition
            MaintenanceWorkflowStateMachine::transition($id, $currentState, $newState, $userId, 'Work completed by technician');
            
            $data = [
                'workflow_status' => $newState,
                'completed_by' => $userId,
                'completed_at' => date('Y-m-d H:i:s')
            ];

            if ($model->update($id, $data)) {
                // Notify supervisor
                if ($request['supervisor_id']) {
                    $this->sendNotification(
                        $request['supervisor_id'],
                        'work_completed',
                        'Work Order Completed',
                        "Work order for request #{$id} has been completed and awaits verification"
                    );
                }
                
                return $this->respond([
                    'status' => 'success',
                    'message' => 'Work order marked as completed'
                ]);
            }

            return $this->fail('Failed to mark work order as completed');
        } catch (\Exception $e) {
            log_message('error', 'markCompleted error: ' . $e->getMessage());
            return $this->fail('Error: ' . $e->getMessage());
        }
    }
    
    /**
     * Technician starts work on assigned work order
     */
    public function startWork($id)
    {
        try {
            $model = new MaintenanceRequestModel();
            $request = $model->find($id);
            
            if (!$request) {
                return $this->failNotFound('Request not found');
            }

            $currentState = $request['workflow_status'];
            $newState = MaintenanceWorkflowStateMachine::STATE_IN_PROGRESS;
            
            // Validate transition
            if (!MaintenanceWorkflowStateMachine::canTransition($currentState, $newState)) {
                return $this->fail("Cannot start work from current state: {$currentState}");
            }

            $userData = ($GLOBALS['jwt_user_data'] ?? null);
            $userId = $userData->user_id ?? 1; // Default to user ID 1 for development
            
            // Verify technician is assigned
            if ($request['assigned_technician_id'] != $userId) {
                return $this->fail('You are not assigned to this work order');
            }
            
            // Record transition
            MaintenanceWorkflowStateMachine::transition($id, $currentState, $newState, $userId, 'Work started');
            
            $data = [
                'workflow_status' => $newState,
                'work_started_at' => date('Y-m-d H:i:s'),
                'work_started_by' => $userId
            ];

            if ($model->update($id, $data)) {
                return $this->respond([
                    'status' => 'success',
                    'message' => 'Work started successfully'
                ]);
            }

            return $this->fail('Failed to start work');
        } catch (\Exception $e) {
            log_message('error', 'startWork error: ' . $e->getMessage());
            return $this->fail('Error: ' . $e->getMessage());
        }
    }
    
    public function markSatisfactory($id)
    {
        $model = new MaintenanceRequestModel();
        $request = $model->find($id);
        
        if (!$request) {
            return $this->failNotFound('Request not found');
        }

        $currentState = $request['workflow_status'];
        $newState = MaintenanceWorkflowStateMachine::STATE_SATISFACTORY;
        
        if (!MaintenanceWorkflowStateMachine::canTransition($currentState, $newState)) {
            return $this->fail("Cannot mark as satisfactory from current state: {$currentState}. Request must be in 'planner_confirmed' state.");
        }

        $userData = ($GLOBALS['jwt_user_data'] ?? null);
        $userId = $userData->user_id ?? 1;
        
        try {
            MaintenanceWorkflowStateMachine::transition($id, $currentState, $newState, $userId, 'Marked as satisfactory by supervisor');
            
            $data = [
                'workflow_status' => $newState,
                'satisfactory_checked_by' => $userId,
                'satisfactory_checked_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];

            if ($model->update($id, $data)) {
                // Notify planner to close
                if ($request['assigned_planner_id']) {
                    $this->sendNotification(
                        $request['assigned_planner_id'],
                        'work_satisfactory',
                        'Work Verified as Satisfactory',
                        "Request #{$id} has been verified as satisfactory and can be closed"
                    );
                }
                
                return $this->respond([
                    'status' => 'success',
                    'message' => 'Request marked as satisfactory. Planner can now close it.',
                    'data' => $model->find($id)
                ]);
            }
            return $this->fail('Failed to update request');
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
    
    public function rejectWork($id)
    {
        $model = new MaintenanceRequestModel();
        $request = $model->find($id);
        
        if (!$request) {
            return $this->failNotFound('Request not found');
        }

        $currentState = $request['workflow_status'];
        $newState = MaintenanceWorkflowStateMachine::STATE_SUPERVISOR_REJECTED;
        
        if (!MaintenanceWorkflowStateMachine::canTransition($currentState, $newState)) {
            return $this->fail("Cannot reject from current state: {$currentState}. Request must be in 'planner_confirmed' state.");
        }

        $userData = ($GLOBALS['jwt_user_data'] ?? null);
        $userId = $userData->user_id ?? 1;
        $data = $this->request->getJSON(true);
        $rejectionReason = $data['rejection_reason'] ?? 'Work not satisfactory';
        
        try {
            MaintenanceWorkflowStateMachine::transition($id, $currentState, $newState, $userId, $rejectionReason);
            
            $updateData = [
                'workflow_status' => $newState,
                'supervisor_rejection_reason' => $rejectionReason,
                'supervisor_rejected_by' => $userId,
                'supervisor_rejected_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];

            if ($model->update($id, $updateData)) {
                // Notify planner to reschedule
                if ($request['assigned_planner_id']) {
                    $this->sendNotification(
                        $request['assigned_planner_id'],
                        'work_rejected',
                        'Work Rejected by Supervisor',
                        "Request #{$id} rejected: {$rejectionReason}. Please reschedule."
                    );
                }
                
                return $this->respond([
                    'status' => 'success',
                    'message' => 'Work rejected. Planner can reschedule.',
                    'data' => $model->find($id)
                ]);
            }
            return $this->fail('Failed to update request');
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
    
    public function confirmCompletion($id)
    {
        $model = new MaintenanceRequestModel();
        $request = $model->find($id);
        
        if (!$request) {
            return $this->failNotFound('Request not found');
        }

        $currentState = $request['workflow_status'];
        $newState = MaintenanceWorkflowStateMachine::STATE_PLANNER_CONFIRMED;
        
        if (!MaintenanceWorkflowStateMachine::canTransition($currentState, $newState)) {
            return $this->fail("Cannot confirm from current state: {$currentState}. Request must be in 'technician_completed' state.");
        }

        $userData = ($GLOBALS['jwt_user_data'] ?? null);
        $userId = $userData->user_id ?? 1;
        
        // Verify planner is assigned
        if ($request['assigned_planner_id'] != $userId) {
            return $this->fail('Only the assigned planner can confirm completion');
        }
        
        try {
            MaintenanceWorkflowStateMachine::transition($id, $currentState, $newState, $userId, 'Completion confirmed by planner');
            
            $data = [
                'workflow_status' => $newState,
                'planner_confirmed_by' => $userId,
                'planner_confirmed_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];

            if ($model->update($id, $data)) {
                // Notify supervisor for verification
                if ($request['supervisor_id']) {
                    $this->sendNotification(
                        $request['supervisor_id'],
                        'planner_confirmed',
                        'Work Confirmed by Planner',
                        "Request #{$id} has been confirmed. Please verify and mark as satisfactory or reject."
                    );
                }
                
                return $this->respond([
                    'status' => 'success',
                    'message' => 'Completion confirmed. Awaiting supervisor verification.',
                    'data' => $model->find($id)
                ]);
            }
            return $this->fail('Failed to update request');
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
    public function closeRequest($id)
    {
        $model = new MaintenanceRequestModel();
        $request = $model->find($id);
        
        if (!$request) {
            return $this->failNotFound('Request not found');
        }

        if ($request['workflow_status'] !== 'satisfactory') {
            return $this->fail('Request must be marked satisfactory by supervisor before closing');
        }

        $userData = ($GLOBALS['jwt_user_data'] ?? null);
        $userId = $userData->user_id ?? 1;
        $userRole = $userData->role ?? null;
        
        $allowedRoles = ['admin', 'manager'];
        $isAssignedPlanner = ($request['assigned_planner_id'] == $userId);
        
        if (!in_array($userRole, $allowedRoles) && !$isAssignedPlanner) {
            return $this->fail('Only the assigned planner or admin can close this request');
        }
        
        $currentState = $request['workflow_status'];
        $newState = MaintenanceWorkflowStateMachine::STATE_CLOSED;
        
        if (!MaintenanceWorkflowStateMachine::canTransition($currentState, $newState)) {
            return $this->fail("Cannot close request from current state: {$currentState}");
        }
        
        MaintenanceWorkflowStateMachine::transition($id, $currentState, $newState, $userId, 'Request closed by planner');
        
        $data = [
            'workflow_status' => $newState,
            'status' => 'completed',
            'closed_by' => $userId,
            'closed_at' => date('Y-m-d H:i:s')
        ];

        if ($model->update($id, $data)) {
            $this->sendNotification(
                $request['requested_by'],
                'request_closed',
                'Maintenance Request Closed',
                "Your maintenance request #{$id} has been completed and closed"
            );
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Request closed successfully'
            ]);
        }

        return $this->fail('Failed to close request');
    }
    
    public function rescheduleWork($id)
    {
        $model = new MaintenanceRequestModel();
        $request = $model->find($id);
        
        if (!$request) {
            return $this->failNotFound('Request not found');
        }

        if ($request['workflow_status'] !== 'supervisor_rejected') {
            return $this->fail('Can only reschedule rejected work');
        }

        $userData = ($GLOBALS['jwt_user_data'] ?? null);
        $userId = $userData->user_id ?? 1;
        
        if ($request['assigned_planner_id'] != $userId) {
            return $this->fail('Only the assigned planner can reschedule work');
        }
        
        $data = $this->request->getJSON(true);
        
        // Validate technician assignment
        if (empty($data['technician_id'])) {
            return $this->fail('Technician assignment is required');
        }
        
        $currentState = $request['workflow_status'];
        $newState = MaintenanceWorkflowStateMachine::STATE_WORK_ORDER_CREATED;
        
        if (!MaintenanceWorkflowStateMachine::canTransition($currentState, $newState)) {
            return $this->fail("Cannot reschedule from current state: {$currentState}");
        }
        
        try {
            $db = \Config\Database::connect();
            
            // Create new work order or update existing
            if ($request['work_order_id']) {
                // Update existing work order
                $db->table('work_orders')->where('id', $request['work_order_id'])->update([
                    'assigned_to' => $data['technician_id'],
                    'assigned_user_id' => $data['technician_id'],
                    'status' => 'assigned',
                    'planned_start' => $data['planned_start'] ?? null,
                    'notes' => ($data['notes'] ?? '') . "\n[Rescheduled: " . ($request['supervisor_rejection_reason'] ?? 'Work rejected') . "]",
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
                $workOrderId = $request['work_order_id'];
            } else {
                // Create new work order
                $woData = [
                    'work_order_number' => $this->generateWorkOrderNumber(),
                    'request_id' => $id,
                    'title' => $request['title'],
                    'description' => $request['description'],
                    'priority' => $request['priority'],
                    'asset_id' => $request['asset_id'],
                    'department_id' => $request['department_id'],
                    'assigned_to' => $data['technician_id'],
                    'assigned_user_id' => $data['technician_id'],
                    'type' => 'corrective',
                    'status' => 'assigned',
                    'planned_start' => $data['planned_start'] ?? null,
                    'notes' => $data['notes'] ?? null,
                    'created_by' => $userId,
                    'created_at' => date('Y-m-d H:i:s')
                ];
                $db->table('work_orders')->insert($woData);
                $workOrderId = $db->insertID();
            }
            
            MaintenanceWorkflowStateMachine::transition($id, $currentState, $newState, $userId, 'Work rescheduled to new technician');
            
            $model->update($id, [
                'work_order_id' => $workOrderId,
                'workflow_status' => $newState,
                'assigned_technician_id' => $data['technician_id'],
                'supervisor_rejection_reason' => null,
                'supervisor_rejected_by' => null,
                'supervisor_rejected_at' => null
            ]);
            
            // Notify new technician
            $this->sendNotification(
                $data['technician_id'],
                'work_rescheduled',
                'Work Order Rescheduled',
                "Work order has been rescheduled to you for request #{$id}"
            );
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Work rescheduled successfully',
                'data' => ['work_order_id' => $workOrderId]
            ]);
        } catch (\Exception $e) {
            return $this->fail('Error: ' . $e->getMessage());
        }
    }
    
    public function markNotificationRead($id = null)
    {
        $db = \Config\Database::connect();
        $db->table('maintenance_notifications')
            ->where('id', $id)
            ->update([
                'is_read' => true,
                'read_at' => date('Y-m-d H:i:s')
            ]);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Notification marked as read'
        ]);
    }
    
    /**
     * Analytics - Summary Report
     */
    public function reportsSummary()
    {
        $model = new MaintenanceRequestModel();
        $db = \Config\Database::connect();
        
        $total = $model->countAll();
        $approved = $model->where('workflow_status', 'approved')->countAllResults(false);
        $rejected = $model->where('workflow_status', 'rejected')->countAllResults(false);
        $converted = $model->where('workflow_status', 'work_order_created')->countAllResults(false);
        
        $approvalRate = $total > 0 ? round(($approved / $total) * 100, 1) : 0;
        $conversionRate = $approved > 0 ? round(($converted / $approved) * 100, 1) : 0;
        
        return $this->respond([
            'status' => 'success',
            'data' => [
                'total' => $total,
                'approved' => $approved,
                'rejected' => $rejected,
                'converted' => $converted,
                'approval_rate' => $approvalRate,
                'conversion_rate' => $conversionRate,
                'avg_approval_time' => '2.5h',
                'avg_conversion_time' => '4.2h',
                'avg_response_time' => '6.7h'
            ]
        ]);
    }
    
    /**
     * Analytics - By Status
     */
    public function reportsByStatus()
    {
        $db = \Config\Database::connect();
        $results = $db->query(
            "SELECT workflow_status as name, COUNT(*) as count 
             FROM maintenance_requests 
             GROUP BY workflow_status"
        )->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $results
        ]);
    }
    
    /**
     * Analytics - By Department
     */
    public function reportsByDepartment()
    {
        $db = \Config\Database::connect();
        $results = $db->query(
            "SELECT COALESCE(d.name, 'Unknown') as department, COUNT(mr.id) as count 
             FROM maintenance_requests mr 
             LEFT JOIN departments d ON d.id = mr.department_id 
             GROUP BY mr.department_id"
        )->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $results
        ]);
    }
    
    /**
     * Analytics - Aging Report
     */
    public function reportsAging()
    {
        $db = \Config\Database::connect();
        $results = $db->query(
            "SELECT 
                CASE 
                    WHEN TIMESTAMPDIFF(HOUR, created_at, NOW()) <= 24 THEN '0-24h'
                    WHEN TIMESTAMPDIFF(HOUR, created_at, NOW()) <= 48 THEN '24-48h'
                    WHEN TIMESTAMPDIFF(HOUR, created_at, NOW()) <= 168 THEN '2-7 days'
                    ELSE '> 1 week'
                END as age_range,
                COUNT(*) as count
             FROM maintenance_requests 
             WHERE workflow_status IN ('pending', 'supervisor_review', 'approved', 'assigned_to_planner')
             GROUP BY age_range"
        )->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $results
        ]);
    }
    
    /**
     * Analytics - By Priority Trend
     */
    public function reportsByPriorityTrend()
    {
        $db = \Config\Database::connect();
        $startDate = $this->request->getGet('start_date') ?? date('Y-m-01');
        $endDate = $this->request->getGet('end_date') ?? date('Y-m-d');
        
        $results = $db->query(
            "SELECT DATE(created_at) as date, priority, COUNT(*) as count 
             FROM maintenance_requests 
             WHERE created_at >= ? AND created_at <= ?
             GROUP BY DATE(created_at), priority 
             ORDER BY date ASC",
            [$startDate, $endDate]
        )->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $results]);
    }
    
    /**
     * Analytics - Response Time Analysis
     */
    public function reportsResponseTime()
    {
        $db = \Config\Database::connect();
        $results = $db->query(
            "SELECT 
                AVG(response_time) as avg_response,
                MIN(response_time) as min_response,
                MAX(response_time) as max_response,
                COUNT(*) as total_requests
             FROM maintenance_requests 
             WHERE response_time IS NOT NULL"
        )->getRowArray();
        
        return $this->respond(['status' => 'success', 'data' => $results]);
    }
    
    /**
     * Analytics - SLA Performance
     */
    public function reportsSlaPerformance()
    {
        $db = \Config\Database::connect();
        $results = $db->query(
            "SELECT 
                sla_status,
                COUNT(*) as count,
                ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM maintenance_requests)), 2) as percentage
             FROM maintenance_requests 
             GROUP BY sla_status"
        )->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $results]);
    }
    
    public function triage($id)
    {
        $model = new MaintenanceRequestModel();
        $request = $model->find($id);
        
        if (!$request) {
            return $this->failNotFound('Request not found');
        }
        
        $userData = ($GLOBALS['jwt_user_data'] ?? null);
        $userId = $userData->user_id ?? 1;
        $userRole = $userData->role ?? 'supervisor';
        
        $stateMachine = new RwopStateMachineService();
        $validation = $stateMachine->validateTransition('maintenance_request', $request['status'], 'triaged', $userRole);
        
        if (!$validation['valid']) {
            return $this->fail($validation['error']);
        }
        
        $data = $this->request->getJSON(true);
        
        if ($model->update($id, [
            'status' => 'triaged',
            'triaged_by' => $userId,
            'triaged_at' => date('Y-m-d H:i:s'),
            'priority' => $data['priority'] ?? $request['priority']
        ])) {
            return $this->respond(['status' => 'success', 'message' => 'Request triaged']);
        }
        
        return $this->fail('Failed to triage request');
    }
    
    /**
     * Helper method to extract user ID from JWT token
     */
    private function getUserIdFromToken()
    {
        $authHeader = $this->request->getHeaderLine('Authorization');
        
        if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        
        if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
            $jwtHandler = new \App\Libraries\JWT\JWTHandler();
            $decoded = $jwtHandler->validateToken($token);
            
            if ($decoded && isset($decoded->data)) {
                return $decoded->data->user_id ?? $decoded->data->id ?? null;
            }
        }
        
        return null;
    }
}
