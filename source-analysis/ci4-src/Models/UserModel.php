<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table = 'users';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        // Core Authentication
        'username', 'email', 'password', 'status', 'role', 'role_id', 'last_login',
        
        // Personal Information
        'title', 'first_name', 'middle_name', 'last_name', 'full_name', 'date_of_birth', 'gender', 
        'marital_status', 'nationality', 'national_id', 'ssnit_number', 'tin_number', 'blood_group',
        
        // Contact Information
        'email', 'personal_email', 'work_email', 'phone', 'home_phone', 'work_phone', 
        'residential_address', 'postal_address', 'region', 'district', 'hometown',
        
        // Employment Details
        'staff_id', 'employee_id', 'employee_number', 'job_title', 'department', 'department_id', 'supervisor_id',
        'employment_type', 'employment_status', 'contract_start_date', 'contract_end_date',
        'probation_end_date', 'confirmation_date', 'hire_date', 'grade_level', 'step', 'work_location', 'shift_type',
        
        // Technician Specific
        'trade', 'hourly_rate', 'group_id', 'is_group_leader', 'certification_level',
        
        // Educational Background
        'highest_education', 'institution', 'field_of_study', 'graduation_year',
        'professional_certifications', 'licenses', 'license_expiry_date',
        
        // Bank & Payroll
        'bank_name', 'bank_branch', 'account_number', 'account_name', 'basic_salary', 
        'allowances', 'payment_frequency',
        
        // Emergency Contacts
        'emergency_contact_1_name', 'emergency_contact_1_relationship', 'emergency_contact_1_phone', 'emergency_contact_1_address',
        'emergency_contact_2_name', 'emergency_contact_2_relationship', 'emergency_contact_2_phone', 'emergency_contact_2_address',
        
        // Health & Safety
        'medical_conditions', 'allergies', 'disability', 'last_medical_checkup', 'next_medical_checkup',
        
        // Work Performance
        'last_promotion_date', 'last_appraisal_date', 'next_appraisal_date', 'performance_rating', 'disciplinary_records',
        
        // Leave Management
        'annual_leave_days', 'sick_leave_days', 'casual_leave_days', 'leave_days_used', 'leave_days_remaining',
        
        // Documents
        'cv_document', 'id_document', 'certificate_documents', 'contract_document',
        
        // System Fields
        'onboarding_completed', 'onboarding_date', 'exit_date', 'exit_reason', 'rehire_eligible'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'username' => 'required|min_length[3]|max_length[50]',
        'email' => 'required|valid_email',
        'first_name' => 'permit_empty|min_length[2]',
        'last_name' => 'permit_empty|min_length[2]',
        'role' => 'permit_empty|in_list[admin,manager,supervisor,planner,operator,technician,shop-attendant]',
        'staff_id' => 'permit_empty',
        'department_id' => 'permit_empty|integer'
    ];

    protected $validationMessages = [
        'username' => [
            'is_unique' => 'This username is already taken.'
        ],
        'email' => [
            'is_unique' => 'This email is already registered.'
        ]
    ];

    public function getUsersWithStats()
    {
        return $this->select('users.*, 
                            COUNT(DISTINCT equipment.id) as equipment_count,
                            COUNT(DISTINCT maintenance_logs.id) as maintenance_count')
                    ->join('equipment', 'users.id = equipment.created_by', 'left')
                    ->join('maintenance_logs', 'users.id = maintenance_logs.technician_id', 'left')
                    ->groupBy('users.id')
                    ->findAll();
    }

    public function getUsersByRole($role)
    {
        return $this->where('role', $role)->where('status', 'active')->findAll();
    }

    public function getTechnicians()
    {
        return $this->whereIn('role', ['technician', 'senior_technician'])
                    ->where('employment_status', 'active')
                    ->findAll();
    }

    public function getSupervisors()
    {
        return $this->whereIn('role', ['supervisor', 'manager', 'admin'])
                    ->where('employment_status', 'active')
                    ->findAll();
    }

    public function update($id = null, $data = null): bool
    {
        // Temporarily disable validation for update
        $this->validationRules = [];
        return parent::update($id, $data);
    }

    public function getEmployeeStats($userId)
    {
        $db = $this->db;
        return [
            'work_orders_assigned' => $db->table('work_orders')->where('assigned_to', $userId)->countAllResults(),
            'work_orders_completed' => $db->table('work_orders')->where('assigned_to', $userId)->where('status', 'completed')->countAllResults(),
            'total_man_hours' => $db->table('work_order_labor')->where('user_id', $userId)->selectSum('hours_worked')->get()->getRow()->hours_worked ?? 0
        ];
    }
}