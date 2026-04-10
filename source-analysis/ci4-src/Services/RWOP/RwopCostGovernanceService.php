<?php
namespace App\Services\RWOP;

class RwopCostGovernanceService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    public function lockCosts(int $workOrderId, int $userId): bool
    {
        $wo = $this->db->table('work_orders')->where('id', $workOrderId)->get()->getRowArray();
        
        if ($wo['status'] !== 'closed') {
            throw new \Exception('Can only lock costs on closed work orders');
        }
        
        return $this->db->table('work_orders')->update($workOrderId, [
            'cost_locked' => 1,
            'cost_locked_by' => $userId,
            'cost_locked_at' => date('Y-m-d H:i:s')
        ]);
    }
    
    public function adjustCost(int $workOrderId, string $type, float $newAmount, string $reason, int $approvedBy, int $adjustedBy): array
    {
        $wo = $this->db->table('work_orders')->where('id', $workOrderId)->get()->getRowArray();
        
        if (!$wo['cost_locked']) {
            return ['success' => false, 'error' => 'Costs are not locked'];
        }
        
        $field = $type . '_cost';
        $originalAmount = $wo[$field];
        $delta = $newAmount - $originalAmount;
        
        $this->db->table('rwop_cost_adjustments')->insert([
            'work_order_id' => $workOrderId,
            'adjustment_type' => $type,
            'original_amount' => $originalAmount,
            'adjusted_amount' => $newAmount,
            'adjustment_delta' => $delta,
            'reason' => $reason,
            'approved_by' => $approvedBy,
            'adjusted_by' => $adjustedBy,
            'adjusted_at' => date('Y-m-d H:i:s')
        ]);
        
        $this->db->table('work_orders')->update($workOrderId, [
            $field => $newAmount,
            'actual_cost' => $wo['actual_cost'] + $delta
        ]);
        
        return ['success' => true, 'delta' => $delta];
    }
}
