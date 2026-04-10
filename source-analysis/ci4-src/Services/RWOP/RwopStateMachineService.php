<?php
namespace App\Services\RWOP;

class RwopStateMachineService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    public function validateTransition(string $entityType, string $fromStatus, string $toStatus, string $userRole): array
    {
        $transition = $this->db->table('rwop_status_transitions')
            ->where('entity_type', $entityType)
            ->where('from_status', $fromStatus)
            ->where('to_status', $toStatus)
            ->get()->getRowArray();
        
        if (!$transition) {
            return ['valid' => false, 'error' => 'Invalid status transition'];
        }
        
        $allowedRoles = json_decode($transition['allowed_roles'], true);
        if (!in_array($userRole, $allowedRoles)) {
            return ['valid' => false, 'error' => 'User role not authorized for this transition'];
        }
        
        return [
            'valid' => true,
            'requires_approval' => $transition['requires_approval'],
            'requires_reason' => $transition['requires_reason']
        ];
    }
    
    public function getAllowedNextStatuses(string $entityType, string $currentStatus, string $userRole): array
    {
        $transitions = $this->db->table('rwop_status_transitions')
            ->where('entity_type', $entityType)
            ->where('from_status', $currentStatus)
            ->get()->getResultArray();
        
        $allowed = [];
        foreach ($transitions as $trans) {
            $roles = json_decode($trans['allowed_roles'], true);
            if (in_array($userRole, $roles)) {
                $allowed[] = [
                    'status' => $trans['to_status'],
                    'requires_approval' => $trans['requires_approval'],
                    'requires_reason' => $trans['requires_reason']
                ];
            }
        }
        
        return $allowed;
    }
}
