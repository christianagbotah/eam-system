<?php

namespace App\Services;

/**
 * Financial Governance Service
 * Handles period locking, cost controls, and financial audit requirements
 */
class FinancialGovernanceService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    /**
     * Lock financial period
     */
    public function lockPeriod(int $year, int $month, int $lockedBy): array
    {
        try {
            // Check if period exists
            $period = $this->db->table('financial_periods')
                              ->where('period_year', $year)
                              ->where('period_month', $month)
                              ->get()
                              ->getRow();
            
            if (!$period) {
                // Create period if it doesn't exist
                $startDate = date('Y-m-01', mktime(0, 0, 0, $month, 1, $year));
                $endDate = date('Y-m-t', mktime(0, 0, 0, $month, 1, $year));
                
                $periodData = [
                    'period_year' => $year,
                    'period_month' => $month,
                    'period_name' => date('M Y', mktime(0, 0, 0, $month, 1, $year)),
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'status' => 'locked',
                    'locked_by' => $lockedBy,
                    'locked_at' => date('Y-m-d H:i:s')
                ];
                
                $this->db->table('financial_periods')->insert($periodData);
            } else {
                // Update existing period
                $this->db->table('financial_periods')
                         ->where('id', $period->id)
                         ->update([
                             'status' => 'locked',
                             'locked_by' => $lockedBy,
                             'locked_at' => date('Y-m-d H:i:s')
                         ]);
            }
            
            // Lock all work orders in this period
            $this->lockWorkOrdersInPeriod($year, $month, $lockedBy);
            
            // Log the action
            $this->logFinancialAction('period_locked', $year . '-' . $month, $lockedBy);
            
            return ['success' => true, 'message' => 'Period locked successfully'];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Unlock financial period (Finance Controller only)
     */
    public function unlockPeriod(int $year, int $month, int $unlockedBy, string $reason): array
    {
        try {
            // Check if user has permission to unlock
            $rbac = new RBACService();
            if (!$rbac->hasPermission($unlockedBy, 'PERIOD_UNLOCK')) {
                return ['success' => false, 'error' => 'Insufficient permissions to unlock period'];
            }
            
            $this->db->table('financial_periods')
                     ->where('period_year', $year)
                     ->where('period_month', $month)
                     ->update([
                         'status' => 'open',
                         'locked_by' => null,
                         'locked_at' => null
                     ]);
            
            // Unlock work orders in this period
            $this->unlockWorkOrdersInPeriod($year, $month, $unlockedBy, $reason);
            
            // Log the action with reason
            $this->logFinancialAction('period_unlocked', $year . '-' . $month, $unlockedBy, $reason);
            
            return ['success' => true, 'message' => 'Period unlocked successfully'];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Check if period is locked
     */
    public function isPeriodLocked(string $date): bool
    {
        $year = date('Y', strtotime($date));
        $month = date('n', strtotime($date));
        
        $period = $this->db->table('financial_periods')
                          ->where('period_year', $year)
                          ->where('period_month', $month)
                          ->where('status', 'locked')
                          ->get()
                          ->getRow();
        
        return $period !== null;
    }
    
    /**
     * Lock work order for editing
     */
    public function lockWorkOrder(string $workOrderId, int $lockedBy, string $reason): array
    {
        try {
            // Check if work order is in locked period
            $workOrder = $this->db->table('work_orders')
                                 ->where('id', $workOrderId)
                                 ->get()
                                 ->getRow();
            
            if (!$workOrder) {
                return ['success' => false, 'error' => 'Work order not found'];
            }
            
            if ($this->isPeriodLocked($workOrder->created_at)) {
                return ['success' => false, 'error' => 'Cannot lock work order in locked financial period'];
            }
            
            $this->db->table('work_orders')
                     ->where('id', $workOrderId)
                     ->update([
                         'is_locked' => true,
                         'locked_by' => $lockedBy,
                         'locked_at' => date('Y-m-d H:i:s'),
                         'lock_reason' => $reason
                     ]);
            
            $this->logFinancialAction('work_order_locked', $workOrderId, $lockedBy, $reason);
            
            return ['success' => true, 'message' => 'Work order locked successfully'];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Unlock work order (Finance Controller only)
     */
    public function unlockWorkOrder(string $workOrderId, int $unlockedBy, string $reason): array
    {
        try {
            $rbac = new RBACService();
            if (!$rbac->hasPermission($unlockedBy, 'WO_UNLOCK')) {
                return ['success' => false, 'error' => 'Insufficient permissions to unlock work order'];
            }
            
            $this->db->table('work_orders')
                     ->where('id', $workOrderId)
                     ->update([
                         'is_locked' => false,
                         'locked_by' => null,
                         'locked_at' => null,
                         'lock_reason' => null
                     ]);
            
            $this->logFinancialAction('work_order_unlocked', $workOrderId, $unlockedBy, $reason);
            
            return ['success' => true, 'message' => 'Work order unlocked successfully'];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Validate cost entry before saving
     */
    public function validateCostEntry(array $costData): array
    {
        try {
            // Check if work order is locked
            $workOrder = $this->db->table('work_orders')
                                 ->where('id', $costData['work_order_id'])
                                 ->get()
                                 ->getRow();
            
            if (!$workOrder) {
                return ['valid' => false, 'error' => 'Work order not found'];
            }
            
            if ($workOrder->is_locked) {
                return ['valid' => false, 'error' => 'Cannot add costs to locked work order'];
            }
            
            // Check if period is locked
            if ($this->isPeriodLocked($workOrder->created_at)) {
                return ['valid' => false, 'error' => 'Cannot add costs in locked financial period'];
            }
            
            // Check if cost requires approval
            $requiresApproval = $this->getSystemConfig('require_cost_approval') === 'true';
            $costThreshold = (float)$this->getSystemConfig('cost_approval_threshold', 1000.00);
            
            if ($requiresApproval && $costData['total_cost'] > $costThreshold) {
                return [
                    'valid' => true,
                    'requires_approval' => true,
                    'threshold' => $costThreshold
                ];
            }
            
            return ['valid' => true, 'requires_approval' => false];
            
        } catch (\Exception $e) {
            return ['valid' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Get financial summary by period
     */
    public function getFinancialSummary(int $year, int $month = null): array
    {
        $query = "
            SELECT 
                DATE_FORMAT(wo.created_at, '%Y-%m') as period,
                COUNT(wo.id) as work_order_count,
                SUM(wo.labor_cost_total) as total_labor_cost,
                SUM(wo.parts_cost_total) as total_parts_cost,
                SUM(wo.contractor_cost_total) as total_contractor_cost,
                SUM(wo.downtime_cost_total) as total_downtime_cost,
                SUM(wo.total_maintenance_cost) as total_maintenance_cost,
                cc.name as cost_center_name,
                cc.budget_annual / 12 as monthly_budget
            FROM work_orders wo
            LEFT JOIN cost_centers cc ON wo.cost_center_id = cc.id
            WHERE YEAR(wo.created_at) = ?
        ";
        
        $params = [$year];
        
        if ($month) {
            $query .= " AND MONTH(wo.created_at) = ?";
            $params[] = $month;
        }
        
        $query .= " GROUP BY DATE_FORMAT(wo.created_at, '%Y-%m'), cc.id ORDER BY period DESC";
        
        return $this->db->query($query, $params)->getResultArray();
    }
    
    /**
     * Get locked periods
     */
    public function getLockedPeriods(): array
    {
        return $this->db->table('financial_periods')
                       ->where('status', 'locked')
                       ->orderBy('period_year DESC, period_month DESC')
                       ->get()
                       ->getResultArray();
    }
    
    /**
     * Auto-lock previous periods
     */
    public function autoLockPreviousPeriods(): array
    {
        try {
            $autoLock = $this->getSystemConfig('auto_lock_periods') === 'true';
            
            if (!$autoLock) {
                return ['success' => false, 'message' => 'Auto-lock is disabled'];
            }
            
            // Lock periods older than 2 months
            $cutoffDate = date('Y-m-01', strtotime('-2 months'));
            $year = date('Y', strtotime($cutoffDate));
            $month = date('n', strtotime($cutoffDate));
            
            // Get unlocked periods before cutoff
            $unlockedPeriods = $this->db->query("
                SELECT DISTINCT YEAR(created_at) as year, MONTH(created_at) as month
                FROM work_orders 
                WHERE created_at < ? 
                    AND (YEAR(created_at), MONTH(created_at)) NOT IN (
                        SELECT period_year, period_month 
                        FROM financial_periods 
                        WHERE status = 'locked'
                    )
            ", [$cutoffDate])->getResultArray();
            
            $lockedCount = 0;
            foreach ($unlockedPeriods as $period) {
                $result = $this->lockPeriod($period['year'], $period['month'], 1); // System user
                if ($result['success']) {
                    $lockedCount++;
                }
            }
            
            return [
                'success' => true,
                'message' => "Auto-locked {$lockedCount} periods",
                'locked_count' => $lockedCount
            ];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Lock work orders in period
     */
    private function lockWorkOrdersInPeriod(int $year, int $month, int $lockedBy): void
    {
        $this->db->query("
            UPDATE work_orders 
            SET is_locked = 1, locked_by = ?, locked_at = NOW(), lock_reason = 'Period locked'
            WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
        ", [$lockedBy, $year, $month]);
    }
    
    /**
     * Unlock work orders in period
     */
    private function unlockWorkOrdersInPeriod(int $year, int $month, int $unlockedBy, string $reason): void
    {
        $this->db->query("
            UPDATE work_orders 
            SET is_locked = 0, locked_by = NULL, locked_at = NULL, lock_reason = NULL
            WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
        ", [$year, $month]);
    }
    
    /**
     * Log financial action for audit
     */
    private function logFinancialAction(string $action, string $recordId, int $userId, string $reason = null): void
    {
        $auditData = [
            'id' => $this->generateUuid(),
            'table_name' => 'financial_governance',
            'record_id' => $recordId,
            'action' => 'update',
            'new_values' => json_encode([
                'action' => $action,
                'reason' => $reason
            ]),
            'user_id' => $userId,
            'checksum' => $this->generateChecksum($action, $recordId, $userId)
        ];
        
        $this->db->table('audit_log')->insert($auditData);
    }
    
    /**
     * Get system configuration
     */
    private function getSystemConfig(string $key, $default = null)
    {
        $config = $this->db->table('system_configuration')
                          ->where('config_key', $key)
                          ->get()
                          ->getRow();
        
        return $config ? $config->config_value : $default;
    }
    
    /**
     * Generate checksum for audit trail
     */
    private function generateChecksum(string $action, string $recordId, int $userId): string
    {
        $data = $action . $recordId . $userId . time();
        return hash('sha256', $data);
    }
    
    /**
     * Generate UUID
     */
    private function generateUuid(): string
    {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}