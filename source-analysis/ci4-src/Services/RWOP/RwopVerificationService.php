<?php
namespace App\Services\RWOP;

class RwopVerificationService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    public function verifyCompletion(int $workOrderId, int $verifierId, array $data): array
    {
        $wo = $this->db->table('work_orders')->where('id', $workOrderId)->get()->getRowArray();
        
        if (!$wo) {
            return ['success' => false, 'error' => 'Work order not found'];
        }
        
        if ($wo['status'] !== 'completed') {
            return ['success' => false, 'error' => 'Work order must be in completed status'];
        }
        
        $verificationId = $this->db->table('rwop_wo_verifications')->insert([
            'work_order_id' => $workOrderId,
            'verified_by' => $verifierId,
            'verification_status' => $data['status'],
            'verification_notes' => $data['notes'] ?? null,
            'checklist_results' => json_encode($data['checklist'] ?? []),
            'rejection_reason' => $data['rejection_reason'] ?? null,
            'verified_at' => date('Y-m-d H:i:s')
        ]);
        
        if ($data['status'] === 'passed') {
            $this->db->table('work_orders')->update($workOrderId, [
                'status' => 'verified',
                'verification_status' => 'passed',
                'verified_by' => $verifierId,
                'updated_at' => date('Y-m-d H:i:s')
            ]);
        } elseif ($data['status'] === 'failed') {
            $this->reopenWorkOrder($workOrderId, $verifierId, $data['rejection_reason']);
        }
        
        return ['success' => true, 'verification_id' => $verificationId];
    }
    
    public function reopenWorkOrder(int $workOrderId, int $userId, string $reason): bool
    {
        $wo = $this->db->table('work_orders')->where('id', $workOrderId)->get()->getRowArray();
        
        $this->db->table('work_orders')->update($workOrderId, [
            'status' => 'in_progress',
            'verification_status' => 'failed',
            'reopen_count' => ($wo['reopen_count'] ?? 0) + 1,
            'updated_at' => date('Y-m-d H:i:s')
        ]);
        
        $this->db->table('rwop_wo_verifications')
            ->where('work_order_id', $workOrderId)
            ->orderBy('id', 'DESC')
            ->limit(1)
            ->update([
                'reopened_at' => date('Y-m-d H:i:s'),
                'reopened_by' => $userId,
                'reopen_reason' => $reason
            ]);
        
        return true;
    }
}
