<?php
namespace App\Services\RWOP;

class RwopReopenService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    public function checkReopenApprovalRequired(int $workOrderId): bool
    {
        $wo = $this->db->table('work_orders')->where('id', $workOrderId)->get()->getRowArray();
        
        $rule = $this->db->table('rwop_reopen_threshold_rules')
            ->where('entity_type', 'work_order')
            ->where('is_active', 1)
            ->get()->getRowArray();
        
        if (!$rule) {
            return false;
        }
        
        $reopenCount = $wo['reopen_count'] ?? 0;
        
        return $reopenCount >= $rule['reopen_count_threshold'];
    }
    
    public function logReopen(int $workOrderId, int $userId, string $reason, bool $approvalRequired): int
    {
        return $this->db->table('rwop_wo_reopens')->insert([
            'work_order_id' => $workOrderId,
            'reopened_by' => $userId,
            'reopen_reason' => $reason,
            'approval_required' => $approvalRequired,
            'approval_status' => $approvalRequired ? 'pending' : 'auto_approved',
            'reopened_at' => date('Y-m-d H:i:s')
        ]);
    }
    
    public function approveReopen(int $reopenId, int $approverId, string $notes = null): bool
    {
        return $this->db->table('rwop_wo_reopens')->update($reopenId, [
            'approved_by' => $approverId,
            'approval_status' => 'approved',
            'approval_notes' => $notes,
            'approved_at' => date('Y-m-d H:i:s')
        ]);
    }
}
