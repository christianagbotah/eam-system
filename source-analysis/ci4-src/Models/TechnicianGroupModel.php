<?php

namespace App\Models;

use CodeIgniter\Model;

class TechnicianGroupModel extends Model
{
    protected $table = 'technician_groups';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'group_name', 'group_code', 'department_id', 'group_leader_id',
        'description', 'specialization', 'is_active'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function getGroupWithMembers($groupId)
    {
        $group = $this->find($groupId);
        if (!$group) return null;

        $db = \Config\Database::connect();
        $members = $db->table('technician_group_members tgm')
            ->select('tgm.*, u.full_name, u.trade, u.employee_number')
            ->join('users u', 'u.id = tgm.technician_id')
            ->where('tgm.group_id', $groupId)
            ->where('tgm.is_active', 1)
            ->get()
            ->getResultArray();

        $group['members'] = $members;
        return $group;
    }

    public function getActiveGroups()
    {
        return $this->where('is_active', 1)->findAll();
    }
}
