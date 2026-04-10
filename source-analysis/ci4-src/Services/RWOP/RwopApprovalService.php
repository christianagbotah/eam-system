<?php
namespace App\Services\RWOP;

class RwopApprovalService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    public function checkApprovalRequired(string $entityType, int $entityId, array $data): array
    {
        $required = [];
        
        if ($entityType === 'maintenance_request' && isset($data['priority'])) {
            $rule = $this->db->table('rwop_approval_matrix')
                ->where('entity_type', $entityType)
                ->where('approval_type', 'standard')
                ->where('priority_level', $data['priority'])
                ->where('is_active', 1)
                ->get()->getRowArray();
            
            if ($rule) {
                $required[] = [
                    'type' => 'standard',
                    'role' => $rule['required_approver_role'],
                    'sequence' => $rule['approval_sequence']
                ];
            }
        }
        
        if (isset($data['estimated_cost']) || isset($data['actual_cost'])) {
            $cost = $data['estimated_cost'] ?? $data['actual_cost'];
            $rule = $this->db->table('rwop_approval_matrix')
                ->where('entity_type', $entityType)
                ->where('approval_type', 'cost_threshold')
                ->where('cost_threshold_min <=', $cost)
                ->where('is_active', 1)
                ->groupStart()
                    ->where('cost_threshold_max >=', $cost)
                    ->orWhere('cost_threshold_max IS NULL')
                ->groupEnd()
                ->get()->getRowArray();
            
            if ($rule) {
                $required[] = [
                    'type' => 'cost_threshold',
                    'role' => $rule['required_approver_role'],
                    'sequence' => $rule['approval_sequence']
                ];
            }
        }
        
        if (isset($data['requires_safety_approval']) && $data['requires_safety_approval']) {
            $rule = $this->db->table('rwop_approval_matrix')
                ->where('entity_type', $entityType)
                ->where('approval_type', 'safety')
                ->where('is_active', 1)
                ->get()->getRowArray();
            
            if ($rule) {
                $required[] = [
                    'type' => 'safety',
                    'role' => $rule['required_approver_role'],
                    'sequence' => $rule['approval_sequence']
                ];
            }
        }
        
        if (isset($data['requires_shutdown']) && $data['requires_shutdown']) {
            $rule = $this->db->table('rwop_approval_matrix')
                ->where('entity_type', $entityType)
                ->where('approval_type', 'shutdown')
                ->where('is_active', 1)
                ->get()->getRowArray();
            
            if ($rule) {
                $required[] = [
                    'type' => 'shutdown',
                    'role' => $rule['required_approver_role'],
                    'sequence' => $rule['approval_sequence']
                ];
            }
        }
        
        return $required;
    }
    
    public function createApprovals(string $entityType, int $entityId, array $approvals): void
    {
        foreach ($approvals as $approval) {
            $this->db->table('rwop_approvals')->insert([
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'approval_type' => $approval['type'],
                'required_approver_role' => $approval['role'],
                'sequence_order' => $approval['sequence'],
                'approval_status' => 'pending',
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }
    
    public function processApproval(int $approvalId, int $userId, string $status, string $notes = null): bool
    {
        return $this->db->table('rwop_approvals')->update($approvalId, [
            'approver_user_id' => $userId,
            'approval_status' => $status,
            'approval_notes' => $notes,
            'approved_at' => date('Y-m-d H:i:s')
        ]);
    }
    
    public function areAllApprovalsComplete(string $entityType, int $entityId): bool
    {
        $pending = $this->db->table('rwop_approvals')
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->where('approval_status', 'pending')
            ->countAllResults();
        
        return $pending === 0;
    }
}
