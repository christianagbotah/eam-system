<?php

namespace App\Models;

use CodeIgniter\Model;

class EmployeeModel extends Model
{
    protected $table = 'employees';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'employee_id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'marital_status',
        'number_of_dependents', 'blood_group', 'disability_status', 'nationality', 'national_id', 'id_type',
        'email', 'phone', 'address', 'city', 'region', 'gps_address', 'photo', 'id_card_front', 'id_card_back',
        'cv_document', 'application_letter', 'appointment_letter', 'other_documents',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
        'education_level', 'professional_qualifications', 'previous_employer', 'years_of_experience',
        'department_id', 'position', 'job_title', 'employment_type', 'salary', 'bank_name', 'bank_account',
        'ssnit_number', 'tin_number', 'work_permit_number', 'work_permit_expiry',
        'health_insurance_number', 'pension_scheme', 'hire_date', 'contract_start_date',
        'contract_end_date', 'probation_end_date', 'termination_date', 'status', 'notes', 'user_id'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    
    protected $validationRules = [];
    protected $validationMessages = [];
    protected $skipValidation = false;

    public function getEmployeeWithShift($id)
    {
        return $this->db->table('employees e')
            ->select('e.*, s.shift_name, s.start_time, s.end_time, es.effective_date')
            ->join('employee_shifts es', 'e.id = es.employee_id', 'left')
            ->join('shifts s', 'es.shift_id = s.id', 'left')
            ->where('e.id', $id)
            ->orderBy('es.effective_date', 'DESC')
            ->limit(1)
            ->get()->getRowArray();
    }

    public function getEmployeesWithShifts()
    {
        return $this->db->table('employees e')
            ->select('e.*, s.shift_name, s.start_time, s.end_time')
            ->join('employee_shifts es', 'e.id = es.employee_id AND es.effective_date = (SELECT MAX(effective_date) FROM employee_shifts WHERE employee_id = e.id)', 'left')
            ->join('shifts s', 'es.shift_id = s.id', 'left')
            ->get()->getResultArray();
    }
}
