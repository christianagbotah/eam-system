<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;
use App\Services\WorkOrderAssignmentService;

class WorkOrderAssignmentController extends BaseResourceController
{
    protected $assignmentService;
    protected $format = 'json';

    public function __construct()
    {
        $this->assignmentService = new WorkOrderAssignmentService();
    }

    public function assign($woId = null)
    {
        $data = $this->request->getJSON(true);
        $userId = $this->getUserId();

        try {
            $result = $this->assignmentService->assign($woId, $data['technician_id'], $userId);
            return $this->respond([
                'status' => 'success',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            if (strpos($e->getMessage(), 'not available') !== false) {
                return $this->respond([
                    'status' => 'conflict',
                    'error' => 'TECHNICIAN_UNAVAILABLE',
                    'message' => $e->getMessage()
                ], 409);
            }
            return $this->fail($e->getMessage());
        }
    }

    public function reassign($woId = null)
    {
        $data = $this->request->getJSON(true);
        $userId = $this->getUserId();

        try {
            $result = $this->assignmentService->reassign($woId, $data['technician_id'], $userId);
            return $this->respond([
                'status' => 'success',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function unassign($woId = null)
    {
        $userId = $this->getUserId();

        try {
            $result = $this->assignmentService->unassign($woId, $userId);
            return $this->respond([
                'status' => 'success',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function getAvailableTechnicians($woId = null)
    {
        try {
            $db = \Config\Database::connect();
            $technicians = $db->table('users')
                ->select('id, username, full_name, role')
                ->whereIn('role', ['technician', 'supervisor'])
                ->where('is_active', 1)
                ->get()->getResultArray();

            return $this->respond([
                'status' => 'success',
                'data' => $technicians
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    protected function getUserId(): int
    {
        $jwt = service('jwtauth');
        $token = $this->request->getHeaderLine('Authorization');
        
        if ($token && strpos($token, 'Bearer ') === 0) {
            $token = substr($token, 7);
            $payload = $jwt->decode($token);
            return $payload['data']['id'] ?? 1;
        }
        
        return 1;
    }
}
