<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseResourceController;
use App\Services\ShiftService;

class EmployeeShiftsController extends BaseResourceController
{
    protected $modelName = 'App\Models\EmployeeShiftModel';
    protected $format = 'json';
    protected $shiftService;

    public function __construct()
    {
        $this->shiftService = new ShiftService();
    }

    public function assign()
    {
        $data = $this->request->getJSON(true);
        $currentUser = $this->getCurrentUser();
        
        $validation = \Config\Services::validation();
        $validation->setRules([
            'user_id' => 'required|integer',
            'shift_id' => 'required|integer',
            'department_id' => 'required|integer',
            'start_date' => 'required|valid_date[Y-m-d]',
            'end_date' => 'permit_empty|valid_date[Y-m-d]'
        ]);
        
        if (!$validation->run($data)) {
            return $this->fail($validation->getErrors());
        }
        
        $result = $this->shiftService->assignUserToShift(
            $data['user_id'],
            $data['shift_id'],
            $data['department_id'],
            $data['start_date'],
            $data['end_date'] ?? null,
            $currentUser
        );
        
        if ($result['status'] === 'error') {
            return $this->fail($result['message']);
        }
        
        return $this->respondCreated($result);
    }

    public function index()
    {
        $userId = $this->request->getGet('user_id');
        $shiftId = $this->request->getGet('shift_id');
        
        $builder = $this->model->builder()
            ->select('employee_shifts.*, shifts.name as shift_name, users.username, users.full_name')
            ->join('shifts', 'shifts.id = employee_shifts.shift_id')
            ->join('users', 'users.id = employee_shifts.user_id');
        
        if ($userId) $builder->where('employee_shifts.user_id', $userId);
        if ($shiftId) $builder->where('employee_shifts.shift_id', $shiftId);
        
        return $this->respond([
            'status' => 'success',
            'data' => $builder->get()->getResultArray(),
            'message' => 'Employee shifts retrieved successfully'
        ]);
    }

    public function delete($id = null)
    {
        if ($this->model->delete($id)) {
            return $this->respondDeleted([
                'status' => 'success',
                'message' => 'Employee shift assignment deleted successfully'
            ]);
        }
        return $this->failNotFound('Assignment not found');
    }
    
    public function bulkImport()
    {
        $file = $this->request->getFile('file');
        $currentUser = $this->getCurrentUser();
        
        if (!$file || !$file->isValid()) {
            return $this->fail('No valid file uploaded');
        }
        
        if ($file->getExtension() !== 'csv') {
            return $this->fail('Only CSV files are allowed');
        }
        
        $result = $this->shiftService->bulkImportRoster($file, $currentUser);
        
        if ($result['status'] === 'error') {
            return $this->fail($result['message']);
        }
        
        return $this->respond($result);
    }
    
    public function bulkAssign()
    {
        $data = $this->request->getJSON(true);
        $currentUser = $this->getCurrentUser();
        
        $validation = \Config\Services::validation();
        $validation->setRules([
            'assignments' => 'required|is_array',
            'assignments.*.user_id' => 'required|integer',
            'assignments.*.shift_id' => 'required|integer',
            'assignments.*.department_id' => 'required|integer',
            'assignments.*.start_date' => 'required|valid_date[Y-m-d]',
            'assignments.*.end_date' => 'permit_empty|valid_date[Y-m-d]'
        ]);
        
        if (!$validation->run($data)) {
            return $this->fail($validation->getErrors());
        }
        
        $result = $this->shiftService->bulkAssignUsers($data['assignments'], $currentUser);
        
        if ($result['status'] === 'error') {
            return $this->fail($result['message']);
        }
        
        return $this->respond($result);
    }
    
    private function getCurrentUser()
    {
        $token = $this->request->getHeaderLine('Authorization');
        $token = str_replace('Bearer ', '', $token);
        
        $jwt = new \App\Libraries\JWT\JWTHandler();
        $payload = $jwt->validateToken($token);
        
        if (!$payload) {
            return null;
        }
        
        return [
            'id' => $payload->sub ?? $payload->user_id,
            'role' => $payload->role ?? 'technician',
            'department_id' => $payload->department_id ?? null
        ];
    }
}
