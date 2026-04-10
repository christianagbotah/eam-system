<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\AssignmentService;

class AssignmentsController extends BaseApiController
{
    protected $service;

    public function __construct()
    {
        $this->service = new AssignmentService();
    }

    public function index()
    {
        $result = $this->service->getAssignments($this->request->getGet());
        return $this->respond($result);
    }

    public function show($id = null)
    {
        $result = $this->service->getAssignment($id);
        return $this->respond($result);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        $data['assigned_by'] = $this->getUser()->id ?? 1;
        $data['start_at'] = date('Y-m-d H:i:s');
        $data['created_at'] = date('Y-m-d H:i:s');
        
        $id = $this->service->assignEquipment($data);
        return $this->respond(['status' => 'success', 'data' => ['id' => $id]], 201);
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        $result = $this->service->updateAssignment($id, $data);
        return $this->respond($result);
    }

    public function delete($id = null)
    {
        $this->service->endAssignment($id);
        return $this->respond(['status' => 'success', 'message' => 'Assignment ended']);
    }

    public function getAssetAssignees($assetId = null)
    {
        $result = $this->service->getActiveAssignees($assetId);
        return $this->respond($result);
    }

    public function getFormData()
    {
        try {
            $user = $this->getUser();
            $userId = $user->id ?? null;
            
            log_message('debug', 'getFormData called for user: ' . $userId);
            
            if (!$userId) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            // Get assets from assets_unified table (machines and equipment)
            $db = \Config\Database::connect();
            $assets = $db->table('assets_unified')
                        ->select('id, asset_name as name, asset_type')
                        ->whereIn('asset_type', ['machine', 'equipment'])
                        ->where('status', 'active')
                        ->get()
                        ->getResultArray();
            
            log_message('debug', 'Assets found: ' . count($assets));
            
            // Get team members (operators and technicians supervised by current user)
            $teamMembers = $db->table('users')
                             ->select('id, username, email, role, supervisor_id')
                             ->where('supervisor_id', $userId)
                             ->whereIn('role', ['operator', 'technician'])
                             ->where('status', 'active')
                             ->get()
                             ->getResultArray();
            
            log_message('debug', 'Team members query: supervisor_id=' . $userId);
            log_message('debug', 'Team members found: ' . count($teamMembers));
            log_message('debug', 'Team members data: ' . json_encode($teamMembers));
            
            // Get operator groups (if table exists)
            $groups = [];
            try {
                $groups = $db->table('operator_groups')
                            ->select('id, name')
                            ->get()
                            ->getResultArray();
                log_message('debug', 'Groups found: ' . count($groups));
            } catch (\Exception $e) {
                log_message('debug', 'operator_groups table not found or error: ' . $e->getMessage());
            }
            
            $response = [
                'status' => 'success',
                'data' => [
                    'assets' => $assets,
                    'team_members' => $teamMembers,
                    'groups' => $groups
                ]
            ];
            
            log_message('debug', 'Response: ' . json_encode($response));
            
            return $this->respond($response);
        } catch (\Exception $e) {
            log_message('error', 'AssignmentsController::getFormData error: ' . $e->getMessage());
            return $this->respond([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
