<?php

namespace App\Models;

use CodeIgniter\Model;

class ToolIssueLogModel extends Model
{
    protected $table = 'tool_issue_logs';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'plant_id', 'tool_request_id', 'tool_id', 'issued_by', 'issued_to',
        'issue_date', 'return_received_by', 'return_date', 'condition_on_issue',
        'condition_on_return', 'damage_notes', 'penalty_cost'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = false; // Immutable - no updates

    public function getLogsByRequest($requestId)
    {
        return $this->select('tool_issue_logs.*,
                             tools.tool_code, tools.tool_name,
                             u1.username as issued_by_name,
                             u2.username as issued_to_name,
                             u3.username as return_received_by_name')
            ->join('tools', 'tools.id = tool_issue_logs.tool_id')
            ->join('users u1', 'u1.id = tool_issue_logs.issued_by', 'left')
            ->join('users u2', 'u2.id = tool_issue_logs.issued_to', 'left')
            ->join('users u3', 'u3.id = tool_issue_logs.return_received_by', 'left')
            ->where('tool_issue_logs.tool_request_id', $requestId)
            ->findAll();
    }

    public function getToolHistory($toolId, $plantId)
    {
        return $this->select('tool_issue_logs.*,
                             u1.username as issued_by_name,
                             u2.username as issued_to_name,
                             work_orders.wo_number')
            ->join('users u1', 'u1.id = tool_issue_logs.issued_by', 'left')
            ->join('users u2', 'u2.id = tool_issue_logs.issued_to', 'left')
            ->join('work_order_tool_requests', 'work_order_tool_requests.id = tool_issue_logs.tool_request_id')
            ->join('work_orders', 'work_orders.id = work_order_tool_requests.work_order_id')
            ->where('tool_issue_logs.tool_id', $toolId)
            ->where('tool_issue_logs.plant_id', $plantId)
            ->orderBy('tool_issue_logs.issue_date', 'DESC')
            ->findAll();
    }

    public function getDamageReport($plantId, $startDate = null, $endDate = null)
    {
        $builder = $this->select('tool_issue_logs.*,
                                 tools.tool_code, tools.tool_name,
                                 users.username as issued_to_name')
            ->join('tools', 'tools.id = tool_issue_logs.tool_id')
            ->join('users', 'users.id = tool_issue_logs.issued_to')
            ->where('tool_issue_logs.plant_id', $plantId)
            ->where('tool_issue_logs.condition_on_return', 'DAMAGED');

        if ($startDate) {
            $builder->where('tool_issue_logs.return_date >=', $startDate);
        }
        if ($endDate) {
            $builder->where('tool_issue_logs.return_date <=', $endDate);
        }

        return $builder->findAll();
    }
}
