<?php

namespace App\Controllers;

use App\Models\DepartmentModel;
use App\Models\UserModel;
use App\Models\EmployeeModel;

class Departments extends BaseController
{
    protected $departmentModel;
    protected $userModel;
    protected $employeeModel;

    public function __construct()
    {
        $this->departmentModel = new DepartmentModel();
        $this->userModel = new UserModel();
        $this->employeeModel = new EmployeeModel();
    }

    public function index()
    {
        $data['departments'] = $this->departmentModel->getDepartmentsWithSupervisors();
        return view('backend/departments/index', $data);
    }

    public function create()
    {
        if ($this->request->getMethod() === 'POST') {
            $data = [
                'department_name' => $this->request->getPost('department_name'),
                'description' => $this->request->getPost('description'),
                'supervisor_id' => $this->request->getPost('supervisor_id') ?: null
            ];

            if ($this->departmentModel->insert($data)) {
                return redirect()->to('/departments')->with('success', 'Department created successfully');
            }
            return redirect()->back()->with('error', 'Failed to create department');
        }
    }

    public function update($id)
    {
        if ($this->request->getMethod() === 'POST') {
            $data = [
                'department_name' => $this->request->getPost('department_name'),
                'description' => $this->request->getPost('description'),
                'supervisor_id' => $this->request->getPost('supervisor_id') ?: null
            ];

            if ($this->departmentModel->update($id, $data)) {
                return redirect()->to('/departments')->with('success', 'Department updated successfully');
            }
            return redirect()->back()->with('error', 'Failed to update department');
        }
    }

    public function delete($id)
    {
        if ($this->departmentModel->delete($id)) {
            return redirect()->to('/departments')->with('success', 'Department deleted successfully');
        }
        return redirect()->back()->with('error', 'Failed to delete department');
    }

    public function employees($id)
    {
        $data['department'] = $this->departmentModel->getDepartmentWithSupervisor($id);
        $data['employees'] = $this->employeeModel->where('department_id', $id)->where('status', 'active')->findAll();
        return view('backend/departments/employees', $data);
    }
}
