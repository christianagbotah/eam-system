<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;
use App\Services\WorkOrderTeamService;
use App\Services\NotificationService;

/**
 * Work Order Team Management Controller
 * 
 * Manages multi-technician work orders, time tracking,
 * team coordination, and performance analytics.
 * 
 * @package App\Controllers\Api\V1
 * @version 2.0.0
 */
class WorkOrderTeamController extends BaseResourceController
{
    protected $format = 'json';
    protected WorkOrderTeamService $teamService;
    protected NotificationService $notificationService;

    public function __construct()
    {
        $this->teamService = new WorkOrderTeamService();
        $this->notificationService = new NotificationService();
    }

    /**
     * Get work order with team members
     * 
     * @param int $workOrderId
     * @return \CodeIgniter\HTTP\ResponseInterface
     */
    public function getWorkOrderTeam($workOrderId)
    {
        try {
            $result = $this->teamService->getWorkOrderTeam($workOrderId);
            
            return $this->respond([
                'status' => 'success',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            log_message('error', 'getWorkOrderTeam error: ' . $e->getMessage());
            return $this->fail($e->getMessage(), 500);
        }
    }

    /**
     * Assign team to work order
     * 
     * @param int $workOrderId
     * @return \CodeIgniter\HTTP\ResponseInterface
     */
    public function assignTeam($workOrderId)
    {
        try {
            $userData = \App\Filters\JWTAuthFilter::getUserData();
            $userId = $userData->user_id ?? null;
            
            if (!$userId) {
                return $this->fail('Authentication required', 401);
            }
            
            $data = $this->request->getJSON(true);
            $technicians = $data['technicians'] ?? [];
            $teamLeaderId = $data['team_leader_id'] ?? null;
            
            if (empty($technicians) || !$teamLeaderId) {
                return $this->fail('Technicians and team leader are required');
            }
            
            $result = $this->teamService->assignTeam($workOrderId, $technicians, $teamLeaderId, $userId);
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Team assigned successfully',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 400);
        }
    }

    /**
     * Start work - record start time
     * 
     * @param int $workOrderId
     * @return \CodeIgniter\HTTP\ResponseInterface
     */
    public function startWork($workOrderId)
    {
        try {
            $userData = \App\Filters\JWTAuthFilter::getUserData();
            $userId = $userData->user_id ?? null;
            
            if (!$userId) {
                return $this->fail('Authentication required', 401);
            }
            
            $result = $this->teamService->startWork($workOrderId, $userId);
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Work started successfully',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 400);
        }
    }

    /**
     * End work - record end time and calculate hours
     * 
     * @param int $workOrderId
     * @return \CodeIgniter\HTTP\ResponseInterface
     */
    public function endWork($workOrderId)
    {
        try {
            $userData = \App\Filters\JWTAuthFilter::getUserData();
            $userId = $userData->user_id ?? null;
            
            if (!$userId) {
                return $this->fail('Authentication required', 401);
            }
            
            $result = $this->teamService->endWork($workOrderId, $userId);
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Work completed successfully',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 400);
        }
    }

    /**
     * Request additional help (team leader only)
     * 
     * @param int $workOrderId
     * @return \CodeIgniter\HTTP\ResponseInterface
     */
    public function requestHelp($workOrderId)
    {
        try {
            $userData = \App\Filters\JWTAuthFilter::getUserData();
            $userId = $userData->user_id ?? null;
            
            if (!$userId) {
                return $this->fail('Authentication required', 401);
            }
            
            $data = $this->request->getJSON(true);
            $technicianIds = $data['technician_ids'] ?? [];
            $reason = $data['reason'] ?? '';
            
            if (empty($technicianIds)) {
                return $this->fail('At least one technician must be requested');
            }
            
            $result = $this->teamService->requestAdditionalHelp($workOrderId, $userId, $technicianIds, $reason);
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Help request submitted successfully',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 400);
        }
    }

    /**
     * Approve help request and add technicians
     * 
     * @param int $requestId
     * @return \CodeIgniter\HTTP\ResponseInterface
     */
    public function approveHelpRequest($requestId)
    {
        try {
            $userData = \App\Filters\JWTAuthFilter::getUserData();
            $userId = $userData->user_id ?? null;
            $userRole = $userData->role ?? null;
            
            if (!in_array($userRole, ['admin', 'planner', 'supervisor'])) {
                return $this->fail('Insufficient permissions', 403);
            }
            
            $this->teamService->approveHelpRequest($requestId, $userId);
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Help request approved and technicians assigned'
            ]);
        } catch (\Exception $e) {
            log_message('error', 'approveHelpRequest error: ' . $e->getMessage());
            return $this->fail($e->getMessage(), 500);
        }
    }

    /**
     * Get team performance summary
     * 
     * @param int $workOrderId
     * @return \CodeIgniter\HTTP\ResponseInterface
     */
    public function getTeamSummary($workOrderId)
    {
        try {
            $metrics = $this->teamService->getTeamMetrics($workOrderId);
            
            return $this->respond([
                'status' => 'success',
                'data' => $metrics
            ]);
        } catch (\Exception $e) {
            log_message('error', 'getTeamSummary error: ' . $e->getMessage());
            return $this->fail($e->getMessage(), 500);
        }
    }

    /**
     * Forward work order to supervisor
     * 
     * @param int $workOrderId
     * @return \CodeIgniter\HTTP\ResponseInterface
     */
    public function forwardToSupervisor($workOrderId)
    {
        try {
            $userData = \App\Filters\JWTAuthFilter::getUserData();
            $userId = $userData->user_id ?? null;
            
            if (!$userId) {
                return $this->fail('Authentication required', 401);
            }
            
            $data = $this->request->getJSON(true);
            $supervisorId = $data['supervisor_id'] ?? null;
            
            if (!$supervisorId) {
                return $this->fail('Supervisor ID is required');
            }
            
            $this->teamService->forwardToSupervisor($workOrderId, $supervisorId, $userId);
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Work order forwarded to supervisor'
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 400);
        }
    }

    /**
     * Get work orders assigned to supervisor
     * 
     * @return \CodeIgniter\HTTP\ResponseInterface
     */
    public function getSupervisorWorkOrders()
    {
        try {
            $userData = \App\Filters\JWTAuthFilter::getUserData();
            $userId = $userData->user_id ?? null;
            
            if (!$userId) {
                return $this->fail('Authentication required', 401);
            }
            
            $db = \Config\Database::connect();
            $workOrders = $db->table('work_orders wo')
                ->select('wo.*, a.asset_name')
                ->join('assets a', 'a.id = wo.asset_id', 'left')
                ->where('wo.assigned_supervisor_id', $userId)
                ->where('wo.status', 'forwarded')
                ->orderBy('wo.created_at', 'DESC')
                ->get()
                ->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $workOrders
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    /**
     * Get all pending help requests
     * 
     * @return \CodeIgniter\HTTP\ResponseInterface
     */
    public function getHelpRequests()
    {
        try {
            $db = \Config\Database::connect();
            
            $requests = $db->table('work_order_help_requests hr')
                ->select('hr.*, wo.work_order_number, u.full_name as requester_name')
                ->join('work_orders wo', 'wo.id = hr.work_order_id', 'left')
                ->join('users u', 'u.id = hr.requested_by', 'left')
                ->where('hr.status', 'pending')
                ->orderBy('hr.created_at', 'DESC')
                ->get()
                ->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $requests
            ]);
        } catch (\Exception $e) {
            log_message('error', 'getHelpRequests error: ' . $e->getMessage());
            return $this->fail($e->getMessage(), 500);
        }
    }

    /**
     * Submit completion report
     * 
     * @param int $workOrderId
     * @return \CodeIgniter\HTTP\ResponseInterface
     */
    public function submitCompletionReport($workOrderId)
    {
        try {
            $userData = \App\Filters\JWTAuthFilter::getUserData();
            $userId = $userData->user_id ?? null;
            
            if (!$userId) {
                return $this->fail('Authentication required', 401);
            }
            
            $data = $this->request->getJSON(true);
            
            $result = $this->teamService->submitCompletionReport($workOrderId, $userId, $data);
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Completion report submitted successfully',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 400);
        }
    }
}
