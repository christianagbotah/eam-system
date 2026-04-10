<?php

namespace App\Services;

class InventoryOptimizationService
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    /**
     * Calculate optimal reorder points for all inventory items
     */
    public function calculateReorderPoints()
    {
        $items = $this->db->table('inventory')->get()->getResult();
        $results = [];

        foreach ($items as $item) {
            $analysis = $this->analyzeItem($item->id);
            
            $reorderPoint = $this->calculateReorderPoint(
                $analysis['avg_daily_usage'],
                $analysis['lead_time_days'],
                $analysis['safety_stock']
            );

            $this->db->table('inventory')
                     ->where('id', $item->id)
                     ->update(['reorder_level' => $reorderPoint]);

            $results[] = [
                'item_id' => $item->id,
                'item_name' => $item->item_name,
                'old_reorder_level' => $item->reorder_level,
                'new_reorder_level' => $reorderPoint,
                'classification' => $analysis['abc_class']
            ];
        }

        return $results;
    }

    /**
     * Analyze item usage patterns
     */
    private function analyzeItem($itemId)
    {
        // Get linked parts
        $parts = $this->db->query("
            SELECT p.id FROM parts p
            INNER JOIN part_inventory_links pil ON p.id = pil.part_id
            WHERE pil.inventory_id = ?
        ", [$itemId])->getResult();

        if (empty($parts)) {
            return [
                'avg_daily_usage' => 0,
                'lead_time_days' => 7,
                'safety_stock' => 5,
                'abc_class' => 'C'
            ];
        }

        $partIds = array_column($parts, 'id');
        
        // Calculate usage from PM tasks
        $usage = $this->db->query("
            SELECT AVG(quantity) as avg_qty, COUNT(*) as usage_count
            FROM pm_task_materials
            WHERE part_id IN (" . implode(',', $partIds) . ")
        ")->getRow();

        $avgDailyUsage = ($usage->avg_qty ?? 0) * ($usage->usage_count ?? 0) / 30;
        
        // ABC Classification based on usage
        $abcClass = 'C';
        if ($avgDailyUsage > 10) $abcClass = 'A';
        elseif ($avgDailyUsage > 5) $abcClass = 'B';

        return [
            'avg_daily_usage' => $avgDailyUsage,
            'lead_time_days' => 7,
            'safety_stock' => ceil($avgDailyUsage * 2),
            'abc_class' => $abcClass
        ];
    }

    /**
     * Calculate reorder point
     * Formula: (Average Daily Usage × Lead Time) + Safety Stock
     */
    private function calculateReorderPoint($avgDailyUsage, $leadTime, $safetyStock)
    {
        return ceil(($avgDailyUsage * $leadTime) + $safetyStock);
    }

    /**
     * Calculate Economic Order Quantity
     * Formula: √((2 × Annual Demand × Order Cost) / Holding Cost)
     */
    public function calculateEOQ($annualDemand, $orderCost = 50, $holdingCost = 5)
    {
        return ceil(sqrt((2 * $annualDemand * $orderCost) / $holdingCost));
    }
}
