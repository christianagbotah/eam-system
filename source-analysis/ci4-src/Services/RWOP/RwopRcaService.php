<?php
namespace App\Services\RWOP;

class RwopRcaService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    public function isRcaRequired(int $workOrderId): bool
    {
        $wo = $this->db->table('work_orders')->where('id', $workOrderId)->get()->getRowArray();
        
        if ($wo['priority'] === 'critical' || $wo['priority'] === 'high') {
            return true;
        }
        
        if (($wo['downtime_minutes'] ?? 0) > 240) {
            return true;
        }
        
        if (($wo['actual_cost'] ?? 0) > 10000) {
            return true;
        }
        
        if (($wo['reopen_count'] ?? 0) >= 2) {
            return true;
        }
        
        return false;
    }
    
    public function createRca(int $workOrderId, int $userId, array $data): int
    {
        return $this->db->table('rwop_wo_failure_analysis')->insert([
            'work_order_id' => $workOrderId,
            'failure_mode_id' => $data['failure_mode_id'],
            'failure_cause_id' => $data['failure_cause_id'],
            'failure_remedy_id' => $data['failure_remedy_id'] ?? null,
            'failure_classification' => $data['classification'],
            'is_primary' => $data['is_primary'] ?? 1,
            'rca_summary' => $data['rca_summary'],
            'corrective_actions' => $data['corrective_actions'] ?? null,
            'preventive_actions' => $data['preventive_actions'] ?? null,
            'analyzed_by' => $userId,
            'analyzed_at' => date('Y-m-d H:i:s')
        ]);
    }
    
    public function markRcaComplete(int $workOrderId, int $userId): bool
    {
        return $this->db->table('work_orders')->update($workOrderId, [
            'rca_completed' => 1,
            'rca_completed_by' => $userId,
            'rca_completed_at' => date('Y-m-d H:i:s')
        ]);
    }
}
