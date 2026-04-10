<?php

namespace App\Services;

/**
 * Enterprise Maintenance Cost Calculation Service
 * Handles automatic cost computation for work orders
 */
class MaintenanceCostService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    /**
     * Calculate total maintenance cost for a work order
     */
    public function calculateWorkOrderCosts(string $workOrderId): array
    {
        $laborCost = $this->calculateLaborCost($workOrderId);
        $partsCost = $this->calculatePartsCost($workOrderId);
        $contractorCost = $this->calculateContractorCost($workOrderId);
        $downtimeCost = $this->calculateDowntimeCost($workOrderId);
        
        $totalCost = $laborCost + $partsCost + $contractorCost + $downtimeCost;
        
        // Update work order with calculated costs
        $this->updateWorkOrderCosts($workOrderId, [
            'labor_cost_total' => $laborCost,
            'parts_cost_total' => $partsCost,
            'contractor_cost_total' => $contractorCost,
            'downtime_cost_total' => $downtimeCost,
            'total_maintenance_cost' => $totalCost
        ]);
        
        return [
            'labor_cost' => $laborCost,
            'parts_cost' => $partsCost,
            'contractor_cost' => $contractorCost,
            'downtime_cost' => $downtimeCost,
            'total_cost' => $totalCost
        ];
    }
    
    /**
     * Calculate labor cost from time entries
     */
    protected function calculateLaborCost(string $workOrderId): float
    {
        $query = "
            SELECT 
                SUM(wte.duration_minutes * (trc.hourly_rate / 60) * 
                    CASE WHEN wte.is_overtime THEN trc.overtime_multiplier ELSE 1 END
                ) as total_labor_cost
            FROM work_order_time_entries wte
            JOIN technician_rate_cards trc ON wte.user_id = trc.user_id
            WHERE wte.work_order_id = ? 
                AND trc.is_active = 1
                AND wte.end_time IS NOT NULL
        ";
        
        $result = $this->db->query($query, [$workOrderId])->getRow();
        return $result->total_labor_cost ?? 0.0;
    }
    
    /**
     * Calculate parts cost from reservations and issues
     */
    protected function calculatePartsCost(string $workOrderId): float
    {
        $query = "
            SELECT SUM(pr.quantity_issued * p.unit_cost) as total_parts_cost
            FROM parts_reservations pr
            JOIN parts p ON pr.part_id = p.id
            WHERE pr.work_order_id = ? AND pr.status IN ('partial_issued', 'fully_issued')
        ";
        
        $result = $this->db->query($query, [$workOrderId])->getRow();
        return $result->total_parts_cost ?? 0.0;
    }
    
    /**
     * Calculate contractor service costs
     */
    protected function calculateContractorCost(string $workOrderId): float
    {
        $query = "
            SELECT SUM(service_cost) as total_contractor_cost
            FROM contractor_services
            WHERE work_order_id = ?
        ";
        
        $result = $this->db->query($query, [$workOrderId])->getRow();
        return $result->total_contractor_cost ?? 0.0;
    }
    
    /**
     * Calculate downtime cost based on production loss
     */
    protected function calculateDowntimeCost(string $workOrderId): float
    {
        $query = "
            SELECT 
                wo.asset_id,
                wo.downtime_start,
                wo.downtime_end,
                TIMESTAMPDIFF(MINUTE, wo.downtime_start, wo.downtime_end) as downtime_minutes
            FROM work_orders wo
            WHERE wo.id = ? AND wo.downtime_start IS NOT NULL AND wo.downtime_end IS NOT NULL
        ";
        
        $workOrder = $this->db->query($query, [$workOrderId])->getRow();
        
        if (!$workOrder || !$workOrder->downtime_minutes) {
            return 0.0;
        }
        
        // Get production loss rate for asset
        $rateQuery = "
            SELECT loss_rate_per_minute
            FROM production_loss_rates
            WHERE asset_id = ? AND is_active = 1
            ORDER BY effective_from DESC LIMIT 1
        ";
        
        $rate = $this->db->query($rateQuery, [$workOrder->asset_id])->getRow();
        
        if (!$rate) {
            return 0.0;
        }
        
        return $workOrder->downtime_minutes * $rate->loss_rate_per_minute;
    }
    
    /**
     * Update work order with calculated costs
     */
    protected function updateWorkOrderCosts(string $workOrderId, array $costs): void
    {
        $this->db->table('work_orders')
                 ->where('id', $workOrderId)
                 ->update($costs);
        
        // Log cost entries for audit trail
        foreach ($costs as $costType => $amount) {
            if ($amount > 0) {
                $this->logCostEntry($workOrderId, $costType, $amount);
            }
        }
    }
    
    /**
     * Log cost entry for audit trail
     */
    protected function logCostEntry(string $workOrderId, string $costType, float $amount): void
    {
        $costTypeMap = [
            'labor_cost_total' => 'labor',
            'parts_cost_total' => 'parts',
            'contractor_cost_total' => 'contractor',
            'downtime_cost_total' => 'downtime'
        ];
        
        $data = [
            'id' => $this->generateUuid(),
            'work_order_id' => $workOrderId,
            'cost_type' => $costTypeMap[$costType] ?? 'overhead',
            'description' => 'Auto-calculated ' . str_replace('_', ' ', $costType),
            'quantity' => 1,
            'unit_cost' => $amount,
            'total_cost' => $amount,
            'created_by' => 1, // System user
            'is_approved' => true,
            'approved_by' => 1,
            'approved_at' => date('Y-m-d H:i:s')
        ];
        
        $this->db->table('maintenance_cost_entries')->insert($data);
    }
    
    /**
     * Generate UUID for cost entries
     */
    protected function generateUuid(): string
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