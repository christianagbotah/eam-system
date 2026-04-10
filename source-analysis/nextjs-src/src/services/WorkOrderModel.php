<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderModel extends Model
{
    protected $table = 'work_orders';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = false;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    
    protected $allowedFields = [
        'id', 'wo_number', 'title', 'description', 'asset_id', 'priority', 
        'status', 'work_type', 'assigned_to', 'requested_by', 'due_date', 
        'completed_at', 'estimated_hours', 'actual_hours', 'shift_id',
        'escalation_level', 'sla_response_minutes', 'sla_repair_hours',
        'downtime_start', 'downtime_end', 'risk_score', 'cost_center_id',
        'labor_cost_total', 'parts_cost_total', 'contractor_cost_total',
        'total_maintenance_cost', 'downtime_cost_total',
        'is_locked', 'locked_by', 'locked_at', 'lock_reason'
    ];
    
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    
    protected $validationRules = [
        'wo_number' => 'required|is_unique[work_orders.wo_number,id,{id}]',
        'title' => 'required|min_length[3]|max_length[255]',
        'asset_id' => 'permit_empty|integer',
        'priority' => 'required|in_list[low,medium,high,critical]',
        'work_type' => 'required|in_list[corrective,preventive,predictive,emergency]',
        'assigned_to' => 'permit_empty|integer',
        'requested_by' => 'required|integer'
    ];
    
    protected $beforeInsert = ['generateId', 'initializeCosts'];
    protected $afterUpdate = ['calculateCostsOnCompletion'];
    
    /**
     * Generate UUID for new work orders
     */
    protected function generateId(array $data)
    {
        if (empty($data['data']['id'])) {
            $data['data']['id'] = $this->generateUuid();
        }
        return $data;
    }
    
    /**
     * Initialize cost fields to zero
     */
    protected function initializeCosts(array $data)
    {
        $costFields = [
            'labor_cost_total', 'parts_cost_total', 'contractor_cost_total',
            'total_maintenance_cost', 'downtime_cost_total'
        ];
        
        foreach ($costFields as $field) {
            if (!isset($data['data'][$field])) {
                $data['data'][$field] = 0.00;
            }
        }
        
        return $data;
    }
    
    /**
     * Auto-calculate costs when work order is completed
     */
    protected function calculateCostsOnCompletion(array $data)
    {
        if (isset($data['data']['status']) && $data['data']['status'] === 'completed') {
            $workOrderId = $data['id'][0] ?? $data['data']['id'] ?? null;
            
            if ($workOrderId) {
                try {
                    $costService = new \App\Services\MaintenanceCostService();
                    $costs = $costService->calculateWorkOrderCosts($workOrderId);
                    
                    log_message('info', "Auto-calculated costs for WO {$workOrderId}: " . json_encode($costs));
                } catch (\Exception $e) {
                    log_message('error', "Failed to calculate costs for WO {$workOrderId}: " . $e->getMessage());
                }
            }
        }
        
        return $data;
    }
    
    /**
     * Get work orders with hierarchy and cost information
     */
    public function getWorkOrdersWithDetails($filters = [])
    {
        $builder = $this->db->table('work_orders wo')
                           ->select('wo.*, a.name as asset_name, a.asset_number,
                                    f.name as facility_name, fa.area_name, pl.line_name,
                                    cc.name as cost_center_name, cc.code as cost_center_code,
                                    u1.username as requested_by_name, u2.username as assigned_to_name')
                           ->join('assets a', 'wo.asset_id = a.id', 'left')
                           ->join('facility f', 'a.facility_id = f.id', 'left')
                           ->join('facility_areas fa', 'a.area_id = fa.id', 'left')
                           ->join('production_lines pl', 'a.line_id = pl.id', 'left')
                           ->join('cost_centers cc', 'wo.cost_center_id = cc.id', 'left')
                           ->join('users u1', 'wo.requested_by = u1.id', 'left')
                           ->join('users u2', 'wo.assigned_to = u2.id', 'left');
        
        // Apply filters
        if (!empty($filters['status'])) {
            if (is_array($filters['status'])) {
                $builder->whereIn('wo.status', $filters['status']);
            } else {
                $builder->where('wo.status', $filters['status']);
            }
        }
        
        if (!empty($filters['priority'])) {
            $builder->where('wo.priority', $filters['priority']);
        }
        
        if (!empty($filters['facility_id'])) {
            $builder->where('a.facility_id', $filters['facility_id']);
        }
        
        if (!empty($filters['assigned_to'])) {
            $builder->where('wo.assigned_to', $filters['assigned_to']);
        }
        
        if (!empty($filters['is_locked'])) {
            $builder->where('wo.is_locked', $filters['is_locked']);
        }
        
        if (!empty($filters['date_from'])) {
            $builder->where('wo.created_at >=', $filters['date_from']);
        }
        
        if (!empty($filters['date_to'])) {
            $builder->where('wo.created_at <=', $filters['date_to']);
        }
        
        return $builder->orderBy('wo.created_at', 'DESC')->get()->getResultArray();
    }
    
    /**
     * Check if work order can be edited
     */
    public function canEdit($workOrderId, $userId = null)
    {
        $workOrder = $this->find($workOrderId);
        
        if (!$workOrder) {
            return ['can_edit' => false, 'reason' => 'Work order not found'];
        }
        
        // Check if locked
        if ($workOrder['is_locked']) {
            return [
                'can_edit' => false, 
                'reason' => 'Work order is locked: ' . $workOrder['lock_reason'],
                'locked_by' => $workOrder['locked_by'],
                'locked_at' => $workOrder['locked_at']
            ];
        }
        
        // Check if in locked financial period
        $financeService = new \App\Services\FinancialGovernanceService();
        if ($financeService->isPeriodLocked($workOrder['created_at'])) {
            return [
                'can_edit' => false,
                'reason' => 'Work order is in a locked financial period'
            ];
        }
        
        // Check if completed and past edit window
        if ($workOrder['status'] === 'completed' && $workOrder['completed_at']) {
            $editWindow = 24; // 24 hours
            $completedTime = strtotime($workOrder['completed_at']);
            $cutoffTime = $completedTime + ($editWindow * 3600);
            
            if (time() > $cutoffTime) {
                return [
                    'can_edit' => false,
                    'reason' => 'Edit window expired (24 hours after completion)'
                ];
            }
        }
        
        return ['can_edit' => true];
    }
    
    /**
     * Get work orders by facility
     */
    public function getWorkOrdersByFacility($facilityId, $status = null)
    {
        $builder = $this->db->table('work_orders wo')
                           ->join('assets a', 'wo.asset_id = a.id')
                           ->where('a.facility_id', $facilityId);
        
        if ($status) {
            $builder->where('wo.status', $status);
        }
        
        return $builder->get()->getResultArray();
    }
    
    /**
     * Get overdue work orders
     */
    public function getOverdueWorkOrders()
    {
        return $this->db->table('work_orders wo')
                       ->select('wo.*, a.name as asset_name, 
                                TIMESTAMPDIFF(HOUR, wo.created_at, NOW()) - wo.sla_repair_hours as hours_overdue')
                       ->join('assets a', 'wo.asset_id = a.id', 'left')
                       ->where('wo.status IN', ['open', 'in_progress'])
                       ->where('DATE_ADD(wo.created_at, INTERVAL wo.sla_repair_hours HOUR) <', 'NOW()', false)
                       ->orderBy('hours_overdue', 'DESC')
                       ->get()
                       ->getResultArray();
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