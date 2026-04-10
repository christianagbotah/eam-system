<?php

namespace App\Models;

use CodeIgniter\Model;

class DepartmentModel extends Model
{
    protected $table = 'departments';
    protected $primaryKey = 'id';
    protected $allowedFields = ['department_code', 'department_name', 'description', 'facility_id', 'parent_id', 'level', 'supervisor_id', 'status', 'staff_id_format', 'staff_id_counter'];
    protected $useTimestamps = true;

    public function getDepartmentWithSupervisor($id)
    {
        return $this->select('departments.*, users.username as supervisor_name')
            ->join('users', 'users.id = departments.supervisor_id', 'left')
            ->find($id);
    }

    public function getDepartmentsWithSupervisors()
    {
        return $this->select('departments.*, users.username as supervisor_name, parent.department_name as parent_name')
            ->join('users', 'users.id = departments.supervisor_id', 'left')
            ->join('departments parent', 'parent.id = departments.parent_id', 'left')
            ->orderBy('departments.level', 'ASC')
            ->orderBy('departments.parent_id', 'ASC')
            ->orderBy('departments.department_name', 'ASC')
            ->findAll();
    }

    public function getMainDepartments()
    {
        return $this->select('departments.*, users.username as supervisor_name')
            ->join('users', 'users.id = departments.supervisor_id', 'left')
            ->where('departments.level', 1)
            ->orWhere('departments.parent_id IS NULL')
            ->orderBy('departments.department_name', 'ASC')
            ->findAll();
    }

    public function getSubDepartments($parentId)
    {
        return $this->select('departments.*, users.username as supervisor_name')
            ->join('users', 'users.id = departments.supervisor_id', 'left')
            ->where('departments.parent_id', $parentId)
            ->orderBy('departments.department_name', 'ASC')
            ->findAll();
    }

    public function getDepartmentHierarchy()
    {
        $mainDepts = $this->getMainDepartments();
        
        foreach ($mainDepts as &$dept) {
            $dept['sub_departments'] = $this->getSubDepartments($dept['id']);
        }
        
        return $mainDepts;
    }

    public function getDepartmentPath($id)
    {
        $dept = $this->find($id);
        if (!$dept) return [];
        
        $path = [$dept];
        
        if ($dept['parent_id']) {
            $parent = $this->find($dept['parent_id']);
            if ($parent) {
                array_unshift($path, $parent);
            }
        }
        
        return $path;
    }
}
