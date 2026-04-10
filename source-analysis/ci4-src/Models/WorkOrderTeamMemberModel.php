<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderTeamMemberModel extends Model
{
    protected $table = 'work_order_team_members';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id', 'technician_id', 'role', 'is_leader',
        'assigned_by', 'assigned_at', 'start_time', 'end_time',
        'hours_worked', 'status', 'notes'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'technician_id' => 'required|integer',
        'role' => 'in_list[leader,assistant,specialist]',
        'is_leader' => 'in_list[0,1]'
    ];

    public function getTeamMembers($workOrderId)
    {
        return $this->select('work_order_team_members.*, users.full_name, users.trade, users.employee_number')
            ->join('users', 'users.id = work_order_team_members.technician_id')
            ->where('work_order_id', $workOrderId)
            ->orderBy('is_leader', 'DESC')
            ->findAll();
    }

    public function getTeamLeader($workOrderId)
    {
        return $this->where(['work_order_id' => $workOrderId, 'is_leader' => 1])->first();
    }

    public function calculateTotalHours($workOrderId)
    {
        return $this->selectSum('hours_worked')
            ->where('work_order_id', $workOrderId)
            ->get()
            ->getRow()
            ->hours_worked ?? 0;
    }
}
