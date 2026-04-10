<?php
namespace App\Models\RWOP;

use CodeIgniter\Model;

class RwopApprovalModel extends Model
{
    protected $table = 'rwop_approvals';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['entity_type', 'entity_id', 'approval_type', 'required_approver_role', 'approver_user_id', 'approval_status', 'approval_notes', 'approved_at', 'sequence_order'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = false;
    
    public function getPendingApprovals($entityType, $entityId)
    {
        return $this->where('entity_type', $entityType)
                    ->where('entity_id', $entityId)
                    ->where('approval_status', 'pending')
                    ->orderBy('sequence_order', 'ASC')
                    ->findAll();
    }
    
    public function areAllApprovalsComplete($entityType, $entityId)
    {
        $pending = $this->where('entity_type', $entityType)
                        ->where('entity_id', $entityId)
                        ->where('approval_status', 'pending')
                        ->countAllResults();
        return $pending === 0;
    }
}
