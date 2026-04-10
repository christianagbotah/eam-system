<?php

namespace App\Controllers;

use App\Models\ShiftModel;
use App\Models\EmployeeModel;
use App\Models\EmployeeShiftModel;

class Shifts extends BaseController
{
    protected $shiftModel;
    protected $employeeModel;
    protected $employeeShiftModel;

    public function __construct()
    {
        $this->shiftModel = new ShiftModel();
        $this->employeeModel = new EmployeeModel();
        $this->employeeShiftModel = new EmployeeShiftModel();
    }

    public function index()
    {
        $data['shifts'] = $this->shiftModel->findAll();
        return view('backend/shifts/index', $data);
    }

    public function create()
    {
        if ($this->request->getMethod() === 'POST') {
            $data = [
                'shift_name' => $this->request->getPost('shift_name'),
                'start_time' => $this->request->getPost('start_time'),
                'end_time' => $this->request->getPost('end_time'),
                'description' => $this->request->getPost('description')
            ];

            if ($this->shiftModel->insert($data)) {
                return $this->response->setJSON(['success' => true, 'message' => 'Shift created successfully']);
            }
            return $this->response->setJSON(['success' => false, 'message' => 'Failed to create shift']);
        }
    }

    public function update($id)
    {
        if ($this->request->getMethod() === 'POST') {
            $data = [
                'shift_name' => $this->request->getPost('shift_name'),
                'start_time' => $this->request->getPost('start_time'),
                'end_time' => $this->request->getPost('end_time'),
                'description' => $this->request->getPost('description')
            ];

            if ($this->shiftModel->update($id, $data)) {
                return $this->response->setJSON(['success' => true, 'message' => 'Shift updated successfully']);
            }
            return $this->response->setJSON(['success' => false, 'message' => 'Failed to update shift']);
        }
    }

    public function delete($id)
    {
        if ($this->shiftModel->delete($id)) {
            return $this->response->setJSON(['success' => true, 'message' => 'Shift deleted successfully']);
        }
        return $this->response->setJSON(['success' => false, 'message' => 'Failed to delete shift']);
    }

    public function assignments($departmentId = null)
    {
        $userRole = session()->get('role');
        $userId = session()->get('id');

        // If supervisor, get their department
        if ($userRole === 'supervisor' && !$departmentId) {
            $departmentModel = new \App\Models\DepartmentModel();
            $dept = $departmentModel->where('supervisor_id', $userId)->first();
            $departmentId = $dept['id'] ?? null;
        }

        // Get employees based on department
        if ($departmentId) {
            $data['employees'] = $this->employeeModel->where('department_id', $departmentId)->where('status', 'active')->findAll();
            $data['department_id'] = $departmentId;
        } else {
            $data['employees'] = $this->employeeModel->where('status', 'active')->findAll();
            $data['department_id'] = null;
        }

        $data['shifts'] = $this->shiftModel->findAll();
        
        // Get current week assignments
        $startOfWeek = date('Y-m-d', strtotime('monday this week'));
        $data['assignments'] = $this->employeeShiftModel
            ->select('employee_shifts.*, employees.first_name, employees.last_name, shifts.shift_name')
            ->join('employees', 'employees.id = employee_shifts.employee_id')
            ->join('shifts', 'shifts.id = employee_shifts.shift_id')
            ->where('employee_shifts.effective_date >=', $startOfWeek)
            ->where('employee_shifts.effective_date <', date('Y-m-d', strtotime($startOfWeek . ' +7 days')))
            ->findAll();

        return view('backend/shifts/assignments', $data);
    }

    public function saveAssignments()
    {
        if ($this->request->getMethod() === 'POST') {
            $json = $this->request->getJSON();
            $assignments = $json->assignments ?? null;
            
            if (!$assignments) {
                return $this->response->setJSON(['success' => false]);
            }

            $db = \Config\Database::connect();
            $db->transStart();

            foreach ($assignments as $assignment) {
                $data = [
                    'employee_id' => $assignment->employee_id,
                    'shift_id' => $assignment->shift_id,
                    'effective_date' => $assignment->date
                ];

                // Check if assignment exists
                $existing = $this->employeeShiftModel
                    ->where('employee_id', $data['employee_id'])
                    ->where('effective_date', $data['effective_date'])
                    ->first();

                if ($existing) {
                    $this->employeeShiftModel->update($existing['id'], $data);
                } else {
                    $this->employeeShiftModel->insert($data);
                }
            }

            $db->transComplete();

            return $this->response->setJSON(['success' => $db->transStatus()]);
        }
    }
}
