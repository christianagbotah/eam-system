<?php

namespace App\Services;

class WorkflowValidationService
{
    private $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    /**
     * Validate work order state transitions
     */
    public function validateWorkOrderTransition($workOrderId, $newStatus, $userId)
    {
        $workOrder = $this->db->query("SELECT * FROM work_orders WHERE id = ?", [$workOrderId])->getRowArray();
        
        if (!$workOrder) {
            throw new \Exception('Work order not found');
        }
        
        // Check if work order is locked
        if ($workOrder['is_locked']) {
            throw new \Exception('Cannot modify locked work order');
        }
        
        // Check financial period lock
        $this->validateFinancialPeriod($workOrder['created_at']);
        
        // Validate state machine transitions
        $validTransitions = [
            'draft' => ['open', 'cancelled'],
            'open' => ['in_progress', 'cancelled', 'on_hold'],
            'in_progress' => ['completed', 'on_hold', 'cancelled'],
            'on_hold' => ['open', 'in_progress', 'cancelled'],
            'completed' => [], // No transitions allowed without override
            'cancelled' => []  // No transitions allowed
        ];
        
        $currentStatus = $workOrder['status'];
        
        if (!in_array($newStatus, $validTransitions[$currentStatus] ?? [])) {
            throw new \Exception("Invalid status transition from {$currentStatus} to {$newStatus}");
        }
        
        // Additional validation for completion
        if ($newStatus === 'completed') {
            $this->validateWorkOrderCompletion($workOrder);
        }
        
        return true;
    }
    
    /**
     * Validate work order completion requirements
     */
    private function validateWorkOrderCompletion($workOrder)
    {
        // Check required fields for completion
        if (empty($workOrder['assigned_user_id'])) {
            throw new \Exception('Work order must be assigned before completion');
        }
        
        // Check if all required tasks are completed (if using task system)
        $incompleteTasks = $this->db->query(
            "SELECT COUNT(*) as count FROM work_order_tasks 
             WHERE work_order_id = ? AND status != 'completed'", 
            [$workOrder['id']]
        )->getRowArray();
        
        if ($incompleteTasks['count'] > 0) {
            throw new \Exception('All tasks must be completed before closing work order');
        }
        
        return true;
    }
    
    /**
     * Validate financial period is not locked
     */
    public function validateFinancialPeriod($date)
    {
        $period = $this->db->query(
            "SELECT status FROM financial_periods 
             WHERE ? BETWEEN start_date AND end_date", 
            [$date]
        )->getRowArray();
        
        if ($period && $period['status'] === 'locked') {
            throw new \Exception('Cannot modify records in locked financial period');
        }
        
        return true;
    }
    
    /**
     * Validate cost modifications
     */
    public function validateCostModification($workOrderId, $costType, $newAmount, $userId)
    {
        $workOrder = $this->db->query("SELECT * FROM work_orders WHERE id = ?", [$workOrderId])->getRowArray();
        
        // Check work order lock
        if ($workOrder['is_locked']) {
            throw new \Exception('Cannot modify costs on locked work order');
        }
        
        // Check financial period
        $this->validateFinancialPeriod($workOrder['created_at']);
        
        // Check user permissions for cost modification
        if (!$this->hasPermission($userId, 'COST_EDIT')) {
            throw new \Exception('Insufficient permissions to modify costs');
        }
        
        // Log cost change for audit
        $this->logCostChange($workOrderId, $costType, $workOrder[$costType] ?? 0, $newAmount, $userId);
        
        return true;
    }
    
    /**
     * Validate shift handover requirements
     */
    public function validateShiftHandover($shiftId, $userId)
    {
        // Check if previous shift was properly handed over
        $pendingHandover = $this->db->query(
            "SELECT COUNT(*) as count FROM shift_handovers 
             WHERE shift_id = ? AND status = 'pending'", 
            [$shiftId - 1]
        )->getRowArray();
        
        if ($pendingHandover['count'] > 0) {
            throw new \Exception('Previous shift handover must be completed first');
        }
        
        // Check if user is authorized for this shift
        $shiftAssignment = $this->db->query(
            "SELECT COUNT(*) as count FROM shift_assignments 
             WHERE shift_id = ? AND user_id = ? AND is_active = 1", 
            [$shiftId, $userId]
        )->getRowArray();
        
        if ($shiftAssignment['count'] === 0) {
            throw new \Exception('User not assigned to this shift');
        }
        
        return true;
    }
    
    /**
     * Check user permissions
     */
    private function hasPermission($userId, $permissionCode)
    {
        $permission = $this->db->query(
            "SELECT COUNT(*) as count FROM user_roles ur
             JOIN enterprise_role_permissions erp ON ur.role_id = erp.role_id
             JOIN enterprise_permissions ep ON erp.permission_id = ep.id
             WHERE ur.user_id = ? AND ep.permission_code = ? AND ur.is_active = 1", 
            [$userId, $permissionCode]
        )->getRowArray();
        
        return $permission['count'] > 0;
    }
    
    /**
     * Log cost changes for audit trail
     */
    private function logCostChange($workOrderId, $costType, $oldAmount, $newAmount, $userId)
    {
        $this->db->query(
            "INSERT INTO cost_history (id, work_order_id, cost_type, old_amount, new_amount, changed_by) 
             VALUES (UUID(), ?, ?, ?, ?, ?)",
            [$workOrderId, $costType, $oldAmount, $newAmount, $userId]
        );
    }
    
    /**
     * Validate mobile sync operations
     */
    public function validateMobileSync($operation, $data, $userId)
    {
        // Ensure mobile operations respect approval chain
        if ($operation === 'complete_work_order') {
            $this->validateWorkOrderTransition($data['work_order_id'], 'completed', $userId);
        }
        
        // Validate offline data integrity
        if (isset($data['offline_timestamp'])) {
            $timeDiff = time() - strtotime($data['offline_timestamp']);
            if ($timeDiff > 86400) { // 24 hours
                throw new \Exception('Offline data too old, manual review required');
            }
        }
        
        return true;
    }
}