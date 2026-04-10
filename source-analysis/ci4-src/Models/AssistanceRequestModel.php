<?php

namespace App\Models;

use CodeIgniter\Model;

class AssistanceRequestModel extends Model
{
    protected $table = 'work_order_assistance_requests';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'work_order_id', 'requested_by', 'requested_to', 'reason',
        'required_skills', 'urgency', 'status', 'approved_by',
        'approved_at', 'assigned_technicians', 'rejection_reason'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'requested_by' => 'required|integer',
        'requested_to' => 'required|integer',
        'reason' => 'required',
        'urgency' => 'in_list[low,medium,high,critical]'
    ];

    public function getPendingRequests($supervisorId = null)
    {
        $builder = $this->select('work_order_assistance_requests.*, work_orders.work_order_number, u1.full_name as requester_name')
            ->join('work_orders', 'work_orders.id = work_order_assistance_requests.work_order_id')
            ->join('users u1', 'u1.id = work_order_assistance_requests.requested_by')
            ->where('work_order_assistance_requests.status', 'pending');
        
        if ($supervisorId) {
            $builder->where('work_order_assistance_requests.requested_to', $supervisorId);
        }
        
        return $builder->orderBy('urgency', 'DESC')->findAll();
    }
}
