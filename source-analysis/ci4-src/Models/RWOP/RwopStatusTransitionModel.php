<?php
namespace App\Models\RWOP;

use CodeIgniter\Model;

class RwopStatusTransitionModel extends Model
{
    protected $table = 'rwop_status_transitions';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['entity_type', 'from_status', 'to_status', 'requires_approval', 'requires_reason', 'allowed_roles', 'validation_rules'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = false;
    
    public function getTransition($entityType, $fromStatus, $toStatus)
    {
        return $this->where('entity_type', $entityType)
                    ->where('from_status', $fromStatus)
                    ->where('to_status', $toStatus)
                    ->first();
    }
    
    public function getAllowedTransitions($entityType, $fromStatus)
    {
        return $this->where('entity_type', $entityType)
                    ->where('from_status', $fromStatus)
                    ->findAll();
    }
}
