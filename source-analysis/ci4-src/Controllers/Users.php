<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\UserModel;

class Users extends BaseController
{
    protected $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
        helper(['form', 'url']);
        
        if (!session()->get('isLoggedIn')) {
            return redirect()->to('/auth/login');
        }
    }

    public function index()
    {
        $roleModel = new \App\Models\RoleModel();
        $db = \Config\Database::connect();
        
        $users = $db->table('users')
            ->select('users.*, roles.id as role_id, roles.name as role')
            ->join('roles', 'roles.id = users.role_id', 'left')
            ->get()
            ->getResultArray();
        
        $data = [
            'title' => 'User Management',
            'users' => $users,
            'roles' => $roleModel->findAll(),
            'controller' => 'users'
        ];

        return view('backend/users/index', $data);
    }

    public function create()
    {
        $data = [
            'title' => 'Add New User',
            'controller' => 'users'
        ];

        return view('backend/users/create', $data);
    }

    public function store()
    {
        $rules = [
            'username' => 'required|min_length[3]|max_length[50]|is_unique[users.username]',
            'first_name' => 'required|min_length[2]|max_length[50]',
            'last_name' => 'required|min_length[2]|max_length[50]',
            'email' => 'required|valid_email|is_unique[users.email]',
            'password' => 'required|min_length[8]',
            'role_id' => 'required|integer',
            'employee_id' => 'required|is_unique[employees.employee_id]',
            'department_id' => 'required|integer'
        ];

        if (!$this->validate($rules)) {
            return $this->response->setJSON(['success' => false, 'message' => implode(', ', $this->validator->getErrors())]);
        }

        $db = \Config\Database::connect();
        $db->transStart();

        // Create user with all fields
        $userData = [
            // Core
            'username' => $this->request->getPost('username'),
            'email' => $this->request->getPost('email') ?: $this->request->getPost('work_email'),
            'password' => password_hash($this->request->getPost('password'), PASSWORD_DEFAULT),
            'role' => $this->request->getPost('role'),
            'status' => 'active',
            
            // Personal
            'title' => $this->request->getPost('title'),
            'first_name' => $this->request->getPost('first_name'),
            'middle_name' => $this->request->getPost('middle_name'),
            'last_name' => $this->request->getPost('last_name'),
            'date_of_birth' => $this->request->getPost('date_of_birth'),
            'gender' => $this->request->getPost('gender'),
            'marital_status' => $this->request->getPost('marital_status'),
            'nationality' => $this->request->getPost('nationality'),
            'national_id' => $this->request->getPost('national_id'),
            'ssnit_number' => $this->request->getPost('ssnit_number'),
            'tin_number' => $this->request->getPost('tin_number'),
            'blood_group' => $this->request->getPost('blood_group'),
            
            // Contact
            'personal_email' => $this->request->getPost('personal_email'),
            'work_email' => $this->request->getPost('work_email'),
            'phone' => $this->request->getPost('phone') ?: $this->request->getPost('work_phone'),
            'home_phone' => $this->request->getPost('home_phone'),
            'work_phone' => $this->request->getPost('work_phone'),
            'residential_address' => $this->request->getPost('residential_address'),
            'postal_address' => $this->request->getPost('postal_address'),
            'region' => $this->request->getPost('region'),
            'district' => $this->request->getPost('district'),
            'hometown' => $this->request->getPost('hometown'),
            
            // Employment
            'staff_id' => $this->request->getPost('staff_id'),
            'department_id' => $this->request->getPost('department_id'),
            'supervisor_id' => $this->request->getPost('supervisor_id'),
            'employment_type' => $this->request->getPost('employment_type'),
            'employment_status' => $this->request->getPost('employment_status') ?: 'active',
            'hire_date' => $this->request->getPost('hire_date'),
            'contract_start_date' => $this->request->getPost('contract_start_date'),
            'contract_end_date' => $this->request->getPost('contract_end_date'),
            'probation_end_date' => $this->request->getPost('probation_end_date'),
            'grade_level' => $this->request->getPost('grade_level'),
            'step' => $this->request->getPost('step'),
            'work_location' => $this->request->getPost('work_location'),
            'shift_type' => $this->request->getPost('shift_type'),
            'trade' => $this->request->getPost('trade'),
            'hourly_rate' => $this->request->getPost('hourly_rate'),
            
            // Education
            'highest_education' => $this->request->getPost('highest_education'),
            'institution' => $this->request->getPost('institution'),
            'field_of_study' => $this->request->getPost('field_of_study'),
            'graduation_year' => $this->request->getPost('graduation_year'),
            'professional_certifications' => $this->request->getPost('professional_certifications'),
            'licenses' => $this->request->getPost('licenses'),
            'license_expiry_date' => $this->request->getPost('license_expiry_date'),
            
            // Bank
            'bank_name' => $this->request->getPost('bank_name'),
            'bank_branch' => $this->request->getPost('bank_branch'),
            'account_number' => $this->request->getPost('account_number'),
            'account_name' => $this->request->getPost('account_name'),
            'basic_salary' => $this->request->getPost('basic_salary'),
            'allowances' => $this->request->getPost('allowances'),
            'payment_frequency' => $this->request->getPost('payment_frequency') ?: 'monthly',
            
            // Emergency
            'emergency_contact_1_name' => $this->request->getPost('emergency_contact_1_name'),
            'emergency_contact_1_relationship' => $this->request->getPost('emergency_contact_1_relationship'),
            'emergency_contact_1_phone' => $this->request->getPost('emergency_contact_1_phone'),
            'emergency_contact_1_address' => $this->request->getPost('emergency_contact_1_address'),
            'emergency_contact_2_name' => $this->request->getPost('emergency_contact_2_name'),
            'emergency_contact_2_relationship' => $this->request->getPost('emergency_contact_2_relationship'),
            'emergency_contact_2_phone' => $this->request->getPost('emergency_contact_2_phone'),
            'emergency_contact_2_address' => $this->request->getPost('emergency_contact_2_address'),
        ];

        $userId = $this->userModel->insert($userData, true);

        // Create employee record
        $employeeModel = new \App\Models\EmployeeModel();
        $employeeData = [
            'employee_id' => $this->request->getPost('employee_id'),
            'first_name' => $this->request->getPost('first_name'),
            'last_name' => $this->request->getPost('last_name'),
            'email' => $this->request->getPost('email'),
            'phone' => $this->request->getPost('phone'),
            'department_id' => $this->request->getPost('department_id'),
            'position' => $this->request->getPost('position'),
            'hire_date' => $this->request->getPost('hire_date') ?: date('Y-m-d'),
            'status' => 'active',
            'user_id' => $userId
        ];

        $employeeModel->insert($employeeData);

        $db->transComplete();

        if ($db->transStatus()) {
            return $this->response->setJSON(['success' => true, 'message' => 'User and employee created successfully!']);
        } else {
            return $this->response->setJSON(['success' => false, 'message' => 'Failed to create user.']);
        }
    }

    public function edit($id)
    {
        $user = $this->userModel->find($id);
        if (!$user) {
            return $this->response->setJSON(['error' => 'User not found']);
        }
        return $this->response->setJSON($user);
    }

    public function update($id)
    {
        $db = \Config\Database::connect();
        
        $userData = [
            // Core
            'username' => $this->request->getPost('username'),
            'email' => $this->request->getPost('email') ?: $this->request->getPost('work_email'),
            'role' => $this->request->getPost('role'),
            
            // Personal
            'title' => $this->request->getPost('title'),
            'first_name' => $this->request->getPost('first_name'),
            'middle_name' => $this->request->getPost('middle_name'),
            'last_name' => $this->request->getPost('last_name'),
            'date_of_birth' => $this->request->getPost('date_of_birth'),
            'gender' => $this->request->getPost('gender'),
            'marital_status' => $this->request->getPost('marital_status'),
            'nationality' => $this->request->getPost('nationality'),
            'national_id' => $this->request->getPost('national_id'),
            'ssnit_number' => $this->request->getPost('ssnit_number'),
            'tin_number' => $this->request->getPost('tin_number'),
            'blood_group' => $this->request->getPost('blood_group'),
            
            // Contact
            'personal_email' => $this->request->getPost('personal_email'),
            'work_email' => $this->request->getPost('work_email'),
            'phone' => $this->request->getPost('phone') ?: $this->request->getPost('work_phone'),
            'home_phone' => $this->request->getPost('home_phone'),
            'work_phone' => $this->request->getPost('work_phone'),
            'residential_address' => $this->request->getPost('residential_address'),
            'postal_address' => $this->request->getPost('postal_address'),
            'region' => $this->request->getPost('region'),
            'district' => $this->request->getPost('district'),
            'hometown' => $this->request->getPost('hometown'),
            
            // Employment
            'staff_id' => $this->request->getPost('staff_id'),
            'department_id' => $this->request->getPost('department_id'),
            'supervisor_id' => $this->request->getPost('supervisor_id'),
            'employment_type' => $this->request->getPost('employment_type'),
            'employment_status' => $this->request->getPost('employment_status'),
            'hire_date' => $this->request->getPost('hire_date'),
            'contract_start_date' => $this->request->getPost('contract_start_date'),
            'contract_end_date' => $this->request->getPost('contract_end_date'),
            'probation_end_date' => $this->request->getPost('probation_end_date'),
            'grade_level' => $this->request->getPost('grade_level'),
            'step' => $this->request->getPost('step'),
            'work_location' => $this->request->getPost('work_location'),
            'shift_type' => $this->request->getPost('shift_type'),
            'trade' => $this->request->getPost('trade'),
            'hourly_rate' => $this->request->getPost('hourly_rate'),
            
            // Education
            'highest_education' => $this->request->getPost('highest_education'),
            'institution' => $this->request->getPost('institution'),
            'field_of_study' => $this->request->getPost('field_of_study'),
            'graduation_year' => $this->request->getPost('graduation_year'),
            'professional_certifications' => $this->request->getPost('professional_certifications'),
            'licenses' => $this->request->getPost('licenses'),
            'license_expiry_date' => $this->request->getPost('license_expiry_date'),
            
            // Bank
            'bank_name' => $this->request->getPost('bank_name'),
            'bank_branch' => $this->request->getPost('bank_branch'),
            'account_number' => $this->request->getPost('account_number'),
            'account_name' => $this->request->getPost('account_name'),
            'basic_salary' => $this->request->getPost('basic_salary'),
            'allowances' => $this->request->getPost('allowances'),
            'payment_frequency' => $this->request->getPost('payment_frequency'),
            
            // Emergency
            'emergency_contact_1_name' => $this->request->getPost('emergency_contact_1_name'),
            'emergency_contact_1_relationship' => $this->request->getPost('emergency_contact_1_relationship'),
            'emergency_contact_1_phone' => $this->request->getPost('emergency_contact_1_phone'),
            'emergency_contact_1_address' => $this->request->getPost('emergency_contact_1_address'),
            'emergency_contact_2_name' => $this->request->getPost('emergency_contact_2_name'),
            'emergency_contact_2_relationship' => $this->request->getPost('emergency_contact_2_relationship'),
            'emergency_contact_2_phone' => $this->request->getPost('emergency_contact_2_phone'),
            'emergency_contact_2_address' => $this->request->getPost('emergency_contact_2_address'),
            
            'updated_at' => date('Y-m-d H:i:s')
        ];

        $password = $this->request->getPost('password');
        if (!empty($password)) {
            $userData['password'] = password_hash($password, PASSWORD_DEFAULT);
        }

        try {
            $db->table('users')->where('id', $id)->update($userData);
            return $this->response->setJSON(['success' => true, 'message' => 'User updated successfully!']);
        } catch (\Exception $e) {
            return $this->response->setJSON(['success' => false, 'message' => 'Failed to update user: ' . $e->getMessage()]);
        }
    }
}