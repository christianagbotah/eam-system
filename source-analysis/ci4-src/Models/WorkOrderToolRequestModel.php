<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderToolRequestModel extends Model
{
    protected $table = 'work_order_tool_requests';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'plant_id', 'work_order_id', 'requested_by', 'tool_id', 'quantity',
        'reason', 'request_status', 'approved_by', 'approved_at', 'rejected_reason',
        'required_from_date', 'expected_return_date', 'actual_return_date'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'plant_id' => 'required|integer',
        'work_order_id' => 'required|integer',
        'requested_by' => 'required|integer',
        'tool_id' => 'required|integer',
        'quantity' => 'required|integer|greater_than[0]',
    ];

    // State machine transitions
    protected $allowedTransitions = [
        'PENDING' => ['APPROVED', 'REJECTED', 'CANCELLED'],
        'APPROVED' => ['ISSUED', 'CANCELLED'],
        'REJECTED' => [],
        'ISSUED' => ['RETURN_PENDING'],
        'RETURN_PENDING' => ['COMPLETED'],
        'COMPLETED' => [],
        'CANCELLED' => []
    ];

    public function getRequestsWithDetails($workOrderId, $plantId)
    {
        return $this->select('work_order_tool_requests.*, 
                             tools.tool_code, tools.tool_name, tools.category,
                             tools.availability_status, tools.condition_status,
                             u1.username as requested_by_name,
                             u2.username as approved_by_name')
            ->join('tools', 'tools.id = work_order_tool_requests.tool_id')
            ->join('users u1', 'u1.id = work_order_tool_requests.requested_by', 'left')
            ->join('users u2', 'u2.id = work_order_tool_requests.approved_by', 'left')
            ->where('work_order_tool_requests.work_order_id', $workOrderId)
            ->where('work_order_tool_requests.plant_id', $plantId)
            ->orderBy('work_order_tool_requests.created_at', 'DESC')
            ->findAll();
    }

    public function canTransition($currentStatus, $newStatus)
    {
        return in_array($newStatus, $this->allowedTransitions[$currentStatus] ?? []);
    }

    public function hasActiveRequests($workOrderId)
    {
        return $this->where('work_order_id', $workOrderId)
            ->whereIn('request_status', ['PENDING', 'APPROVED', 'ISSUED', 'RETURN_PENDING'])
            ->countAllResults() > 0;
    }

    public function getOverdueReturns($plantId)
    {
        return $this->select('work_order_tool_requests.*, 
                             tools.tool_code, tools.tool_name,
                             users.username as requested_by_name,
                             work_orders.wo_number')
            ->join('tools', 'tools.id = work_order_tool_requests.tool_id')
            ->join('users', 'users.id = work_order_tool_requests.requested_by')
            ->join('work_orders', 'work_orders.id = work_order_tool_requests.work_order_id')
            ->where('work_order_tool_requests.plant_id', $plantId)
            ->where('work_order_tool_requests.request_status', 'ISSUED')
            ->where('work_order_tool_requests.expected_return_date <', date('Y-m-d H:i:s'))
            ->findAll();
    }
}
