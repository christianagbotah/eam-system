<?php

namespace App\Controllers;

use App\Models\EmployeeModel;
use App\Models\DepartmentModel;
use App\Models\UserModel;
use App\Models\RoleModel;

class Employees extends BaseController
{
    protected $employeeModel;
    protected $departmentModel;
    protected $userModel;
    protected $roleModel;
    protected $db;

    public function __construct()
    {
        $this->employeeModel = new EmployeeModel();
        $this->departmentModel = new DepartmentModel();
        $this->userModel = new UserModel();
        $this->roleModel = new RoleModel();
        $this->db = \Config\Database::connect();
    }

    public function index()
    {
        $data['employees'] = $this->employeeModel
            ->select('employees.*, departments.department_name')
            ->join('departments', 'departments.id = employees.department_id', 'left')
            ->findAll();
        return view('backend/employees/index', $data);
    }

    public function create()
    {
        if (strtolower($this->request->getMethod()) === 'post') {
            header('Content-Type: application/json');
            try {
                $data = $this->request->getPost();
                $createUser = $this->request->getPost('create_user');
                
                // Remove user-specific fields
                unset($data['create_user'], $data['username'], $data['password'], $data['role_id']);
                $data['status'] = 'active';
                
                // Handle file uploads
                $uploadPath = FCPATH . 'uploads/employees';
                if (!is_dir($uploadPath)) {
                    mkdir($uploadPath, 0777, true);
                }
                
                foreach (['photo', 'id_card_front', 'id_card_back', 'cv_document', 'application_letter', 'appointment_letter'] as $field) {
                    $file = $this->request->getFile($field);
                    if ($file && $file->isValid() && !$file->hasMoved()) {
                        $newName = $field . '_' . time() . '_' . $file->getRandomName();
                        $file->move($uploadPath, $newName);
                        $data[$field] = $newName;
                    }
                }

                $employeeId = $this->employeeModel->insert($data);
                if (!$employeeId) {
                    echo json_encode(['success' => false, 'message' => 'Failed to insert employee']);
                    exit;
                }
                
                if ($createUser) {
                    $roleId = $this->request->getPost('role_id');
                    $role = $this->roleModel->find($roleId);
                    
                    $userData = [
                        'username' => $this->request->getPost('username'),
                        'email' => $this->request->getPost('email'),
                        'password' => password_hash($this->request->getPost('password'), PASSWORD_DEFAULT),
                        'first_name' => $this->request->getPost('first_name'),
                        'last_name' => $this->request->getPost('last_name'),
                        'role' => $role['name'] ?? 'operator',
                        'role_id' => $roleId,
                        'phone' => $this->request->getPost('phone'),
                        'status' => 'active',
                        'employee_id' => $employeeId
                    ];
                    
                    if (!$this->userModel->insert($userData)) {
                        $errors = $this->userModel->errors();
                        echo json_encode(['success' => false, 'message' => 'Failed to create user account: ' . json_encode($errors)]);
                        exit;
                    }
                }
                
                echo json_encode(['success' => true, 'message' => 'Employee added successfully']);
                exit;
                
            } catch (\Throwable $e) {
                
                log_message('error', 'Employee creation error: ' . $e->getMessage());
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
                exit;
            }

        }

        $data['departments'] = $this->departmentModel->findAll();
        $data['roles'] = $this->roleModel->findAll();
        return view('backend/employees/create', $data);
    }

    public function edit($id)
    {
        $data['employee'] = $this->employeeModel->find($id);
        $data['departments'] = $this->departmentModel->findAll();
        $data['roles'] = $this->roleModel->findAll();
        $data['user'] = $this->userModel->where('employee_id', $id)->first();
        return view('backend/employees/edit', $data);
    }

    public function update($id)
    {
        if (strtolower($this->request->getMethod()) === 'post') {
            header('Content-Type: application/json');
            try {
                $data = $this->request->getPost();
                unset($data['create_user'], $data['username'], $data['password'], $data['role_id']);
                
                // Handle file uploads
                $uploadPath = FCPATH . 'uploads/employees';
                if (!is_dir($uploadPath)) {
                    mkdir($uploadPath, 0777, true);
                }
                
                foreach (['photo', 'id_card_front', 'id_card_back', 'cv_document', 'application_letter', 'appointment_letter'] as $field) {
                    $file = $this->request->getFile($field);
                    if ($file && $file->isValid() && !$file->hasMoved()) {
                        $newName = $field . '_' . time() . '_' . $file->getRandomName();
                        $file->move($uploadPath, $newName);
                        $data[$field] = $newName;
                    }
                }

                if ($this->employeeModel->update($id, $data)) {
                    echo json_encode(['success' => true, 'message' => 'Employee updated successfully']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to update employee']);
                }
            } catch (\Throwable $e) {
                log_message('error', 'Employee update error: ' . $e->getMessage());
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
            exit;
        }
    }

    public function view($id)
    {
        $data['employee'] = $this->employeeModel
            ->select('employees.*, departments.department_name')
            ->join('departments', 'departments.id = employees.department_id', 'left')
            ->find($id);
        
        if (!$data['employee']) {
            return redirect()->to('/employees')->with('error', 'Employee not found');
        }
        
        return view('backend/employees/view', $data);
    }

    public function downloadDocument($field, $id)
    {
        $employee = $this->employeeModel->find($id);
        if (!$employee || !$employee[$field]) {
            return redirect()->back()->with('error', 'Document not found');
        }
        
        $filepath = FCPATH . 'uploads/employees/' . $employee[$field];
        if (file_exists($filepath)) {
            return $this->response->download($filepath, null);
        }
        return redirect()->back()->with('error', 'File not found');
    }

    public function delete($id)
    {
        if ($this->employeeModel->delete($id)) {
            return redirect()->to('/employees')->with('success', 'Employee deleted successfully');
        }
        return redirect()->back()->with('error', 'Failed to delete employee');
    }
}
