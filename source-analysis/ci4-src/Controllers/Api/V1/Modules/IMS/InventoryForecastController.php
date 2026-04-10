<?php

namespace App\Controllers\Api\V1\Modules\IMS;

use App\Controllers\Api\V1\BaseApiController;

class InventoryForecastController extends BaseApiController
{
    protected $format = 'json';

    public function index()
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'view')) {
            return $this->failForbidden('Insufficient permissions to view inventory forecasts');
        }

        $days = $this->request->getGet('days') ?? 30;
        $db = \Config\Database::connect();

        // Get PM schedule consumption
        $query = "
            SELECT
                p.id as part_id,
                p.part_name,
                p.part_number,
                COALESCE(SUM(i.quantity), 0) as current_stock,
                COALESCE(AVG(ptm.quantity), 0) as avg_consumption_per_task,
                COUNT(DISTINCT pt.id) as pm_task_count
            FROM parts p
            LEFT JOIN part_inventory_links pil ON p.id = pil.part_id
            LEFT JOIN inventory i ON pil.inventory_id = i.id
            LEFT JOIN pm_task_materials ptm ON p.id = ptm.part_id
            LEFT JOIN pm_tasks pt ON ptm.pm_task_id = pt.id
            WHERE p.is_spare_part = 1
            GROUP BY p.id
        ";

        $parts = $db->query($query)->getResult();
        $forecasts = [];

        foreach ($parts as $part) {
            $monthlyConsumption = $part->avg_consumption_per_task * $part->pm_task_count;
            $forecast30d = ($monthlyConsumption / 30) * 30;
            $forecast90d = ($monthlyConsumption / 30) * 90;

            $stockOutRisk = 'low';
            if ($part->current_stock < $forecast30d) {
                $stockOutRisk = 'high';
            } elseif ($part->current_stock < $forecast30d * 1.5) {
                $stockOutRisk = 'medium';
            }

            $recommendedOrder = max(0, $forecast90d - $part->current_stock);

            $forecasts[] = [
                'part_id' => $part->part_id,
                'part_name' => $part->part_name,
                'part_number' => $part->part_number,
                'current_stock' => (int)$part->current_stock,
                'avg_monthly_consumption' => round($monthlyConsumption, 2),
                'forecasted_consumption_30d' => round($forecast30d, 2),
                'forecasted_consumption_90d' => round($forecast90d, 2),
                'stock_out_risk' => $stockOutRisk,
                'recommended_order_qty' => round($recommendedOrder, 0)
            ];
        }

        // Audit log
        $this->auditLog('VIEW', 'inventory_forecast', 0, null, ['count' => count($forecasts), 'days' => $days]);

        return $this->respond([
            'status' => 'success',
            'data' => $forecasts
        ]);
    }
}
