<?php

namespace App\Repositories;

class ShiftRepository
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function userExists($userId)
    {
        return $this->db->table('users')->where('id', $userId)->countAllResults() > 0;
    }

    public function shiftExists($shiftId)
    {
        return $this->db->table('shifts')->where('id', $shiftId)->countAllResults() > 0;
    }
    
    public function departmentExists($departmentId)
    {
        return $this->db->table('departments')->where('id', $departmentId)->countAllResults() > 0;
    }

    public function findShift($shiftId)
    {
        return $this->db->table('shifts')->where('id', $shiftId)->get()->getRowArray();
    }
    
    public function findDepartment($departmentId)
    {
        return $this->db->table('departments')->where('id', $departmentId)->get()->getRowArray();
    }

    public function hasOverlappingAssignment($userId, $startDate, $endDate)
    {
        $builder = $this->db->table('employee_shifts')->where('user_id', $userId);
        
        if ($endDate) {
            $builder->groupStart()
                ->where('start_date <=', $endDate)
                ->groupStart()
                    ->where('end_date >=', $startDate)
                    ->orWhere('end_date IS NULL')
                ->groupEnd()
            ->groupEnd();
        } else {
            $builder->groupStart()
                ->where('end_date >=', $startDate)
                ->orWhere('end_date IS NULL')
            ->groupEnd();
        }
        
        return $builder->countAllResults() > 0;
    }

    public function createAssignment($data)
    {
        $this->db->table('employee_shifts')->insert($data);
        return $this->db->insertID();
    }

    public function getAssignmentAtDate($userId, $date)
    {
        return $this->db->table('employee_shifts')
            ->where('user_id', $userId)
            ->where('start_date <=', $date)
            ->groupStart()
                ->where('end_date >=', $date)
                ->orWhere('end_date IS NULL')
            ->groupEnd()
            ->limit(1)
            ->get()->getRowArray();
    }
    
    public function getDepartmentRosterAtDate($departmentId, $date)
    {
        return $this->db->table('employee_shifts es')
            ->select('es.*, u.id as user_id, u.username, u.full_name, u.email, s.name as shift_name, s.start_time, s.end_time')
            ->join('users u', 'u.id = es.user_id')
            ->join('shifts s', 's.id = es.shift_id')
            ->where('es.department_id', $departmentId)
            ->where('es.start_date <=', $date)
            ->groupStart()
                ->where('es.end_date >=', $date)
                ->orWhere('es.end_date IS NULL')
            ->groupEnd()
            ->get()->getResultArray();
    }
}
