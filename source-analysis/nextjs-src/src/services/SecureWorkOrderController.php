<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use App\Services\WorkflowValidationService;

class SecureWorkOrderController extends ResourceController
{
    protected $format = 'json';
    private $workflowValidator;
    
    public function __construct()
    {
        $this->workflowValidator = new WorkflowValidationService();
    }
    
    /**
     * Update work order with workflow validation
     */
    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $userId = $this->request->getHeaderLine('User-ID') ?: 1;
        
        try {
            $db->transStart();
            
            // Get current work order
            $currentWO = $db->query("SELECT * FROM work_orders WHERE id = ?", [$id])->getRowArray();
            if (!$currentWO) {
                return $this->respond(['status' => 'error', 'message' => 'Work order not found'], 404);
            }
            
            // Validate status change if provided
            if (isset($data['status']) && $data['status'] !== $currentWO['status']) {
                $this->workflowValidator->validateWorkOrderTransition($id, $data['status'], $userId);
            }
            
            // Validate cost changes if provided
            $costFields = ['total_cost', 'labor_cost_total', 'parts_cost_total', 'contractor_cost_total'];
            foreach ($costFields as $field) {
                if (isset($data[$field]) && $data[$field] != ($currentWO[$field] ?? 0)) {
                    $this->workflowValidator->validateCostModification($id, $field, $data[$field], $userId);
                }
            }
            
            // Add audit fields
            $data['updated_at'] = date('Y-m-d H:i:s');
            $data['updated_by'] = $userId;
            
            // Update work order
            $db->table('work_orders')->where('id', $id)->update($data);
            
            // Log the change in audit log
            $this->logAuditEntry('work_orders', $id, 'update', $currentWO, $data, $userId);
            
            $db->transComplete();
            
            if ($db->transStatus() === false) {
                return $this->respond(['status' => 'error', 'message' => 'Failed to update work order'], 500);
            }
            
            return $this->respond(['status' => 'success', 'message' => 'Work order updated successfully']);
            
        } catch (\Exception $e) {
            $db->transRollback();
            return $this->respond(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
    
    /**
     * Complete work order with full validation
     */
    public function complete($id = null)
    {
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $userId = $this->request->getHeaderLine('User-ID') ?: 1;
        
        try {
            $db->transStart();
            
            // Validate completion
            $this->workflowValidator->validateWorkOrderTransition($id, 'completed', $userId);
            
            // Update work order
            $updateData = [
                'status' => 'completed',
                'actual_end' => date('Y-m-d H:i:s'),
                'completed_by' => $userId,
                'completion_notes' => $data['completion_notes'] ?? null,
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            $db->table('work_orders')->where('id', $id)->update($updateData);
            
            // Calculate final costs if not already set
            $this->calculateFinalCosts($id);
            
            // Log completion
            $this->logAuditEntry('work_orders', $id, 'complete', null, $updateData, $userId);
            
            $db->transComplete();
            
            return $this->respond(['status' => 'success', 'message' => 'Work order completed successfully']);
            
        } catch (\Exception $e) {
            $db->transRollback();
            return $this->respond(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
    
    /**
     * Lock work order (financial period lock)
     */
    public function lock($id = null)
    {
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $userId = $this->request->getHeaderLine('User-ID') ?: 1;
        
        try {
            // Check permissions
            if (!$this->hasPermission($userId, 'WO_LOCK')) {
                return $this->respond(['status' => 'error', 'message' => 'Insufficient permissions'], 403);
            }
            
            $lockData = [
                'is_locked' => true,
                'locked_by' => $userId,
                'locked_at' => date('Y-m-d H:i:s'),
                'lock_reason' => $data['reason'] ?? 'Manual lock'
            ];
            
            $db->table('work_orders')->where('id', $id)->update($lockData);
            
            // Log the lock
            $this->logAuditEntry('work_orders', $id, 'lock', null, $lockData, $userId);
            
            return $this->respond(['status' => 'success', 'message' => 'Work order locked successfully']);
            
        } catch (\Exception $e) {
            return $this->respond(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
    
    /**
     * Calculate final costs for completed work order
     */
    private function calculateFinalCosts($workOrderId)
    {
        $db = \Config\Database::connect();
        
        // Calculate labor costs
        $laborCost = $db->query(
            "SELECT COALESCE(SUM(hours * rate), 0) as total 
             FROM work_order_time_entries wote
             JOIN technician_rate_cards trc ON wote.technician_id = trc.technician_id
             WHERE wote.work_order_id = ?", 
            [$workOrderId]
        )->getRowArray()['total'];
        
        // Calculate parts costs
        $partsCost = $db->query(
            "SELECT COALESCE(SUM(quantity * unit_cost), 0) as total 
             FROM work_order_materials 
             WHERE work_order_id = ?", 
            [$workOrderId]
        )->getRowArray()['total'];
        
        // Update total costs
        $totalCost = $laborCost + $partsCost;
        
        $db->table('work_orders')->where('id', $workOrderId)->update([
            'labor_cost_total' => $laborCost,
            'parts_cost_total' => $partsCost,
            'total_cost' => $totalCost
        ]);
    }
    
    /**
     * Check user permissions
     */
    private function hasPermission($userId, $permissionCode)
    {
        $db = \Config\Database::connect();
        
        $permission = $db->query(
            "SELECT COUNT(*) as count FROM user_roles ur
             JOIN enterprise_role_permissions erp ON ur.role_id = erp.role_id
             JOIN enterprise_permissions ep ON erp.permission_id = ep.id
             WHERE ur.user_id = ? AND ep.permission_code = ? AND ur.is_active = 1", 
            [$userId, $permissionCode]
        )->getRowArray();
        
        return $permission['count'] > 0;
    }
    
    /**
     * Log audit entry
     */
    private function logAuditEntry($tableName, $recordId, $action, $oldValues, $newValues, $userId)
    {
        $db = \Config\Database::connect();
        
        $auditData = [
            'id' => uniqid(),
            'table_name' => $tableName,
            'record_id' => $recordId,
            'action' => $action,
            'old_values' => $oldValues ? json_encode($oldValues) : null,
            'new_values' => json_encode($newValues),
            'user_id' => $userId,
            'ip_address' => $this->request->getIPAddress(),
            'user_agent' => $this->request->getUserAgent()->getAgentString(),
            'checksum' => hash('sha256', $tableName . $recordId . $action . time())
        ];
        
        $db->table('audit_log')->insert($auditData);
    }
}