<?php
namespace App\Models\RWOP;

use CodeIgniter\Model;

class RwopWoVerificationModel extends Model
{
    protected $table = 'rwop_wo_verifications';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['work_order_id', 'verified_by', 'verification_status', 'verification_notes', 'checklist_results', 'rejection_reason', 'verified_at', 'reopened_at', 'reopened_by', 'reopen_reason'];
    protected $useTimestamps = false;
    
    public function getByWorkOrder($workOrderId)
    {
        return $this->where('work_order_id', $workOrderId)
                    ->orderBy('verified_at', 'DESC')
                    ->findAll();
    }
    
    public function getLatestVerification($workOrderId)
    {
        return $this->where('work_order_id', $workOrderId)
                    ->orderBy('verified_at', 'DESC')
                    ->first();
    }
}
