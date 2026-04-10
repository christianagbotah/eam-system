<?php
namespace App\Models\RWOP;

use CodeIgniter\Model;

class RwopApprovalMatrixModel extends Model
{
    protected $table = 'rwop_approval_matrix';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['entity_type', 'approval_type', 'priority_level', 'cost_threshold_min', 'cost_threshold_max', 'required_approver_role', 'approval_sequence', 'is_active'];
    protected $useTimestamps = true;
    
    public function getApprovalRules($entityType, $approvalType, $filters = [])
    {
        $builder = $this->where('entity_type', $entityType)
                        ->where('approval_type', $approvalType)
                        ->where('is_active', 1);
        
        if (isset($filters['priority'])) {
            $builder->where('priority_level', $filters['priority']);
        }
        
        if (isset($filters['cost'])) {
            $builder->where('cost_threshold_min <=', $filters['cost'])
                    ->groupStart()
                        ->where('cost_threshold_max >=', $filters['cost'])
                        ->orWhere('cost_threshold_max IS NULL')
                    ->groupEnd();
        }
        
        return $builder->orderBy('approval_sequence', 'ASC')->findAll();
    }
}
