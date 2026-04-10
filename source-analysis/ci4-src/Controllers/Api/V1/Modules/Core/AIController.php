<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class AIController extends ResourceController
{
    protected $format = 'json';

    public function query()
    {
        $data = $this->request->getJSON(true);
        $query = strtolower($data['query']);
        
        $response = $this->processQuery($query);
        
        return $this->respond(['status' => 'success', 'response' => $response]);
    }

    private function processQuery($query)
    {
        $db = \Config\Database::connect();
        
        if (strpos($query, 'critical') !== false && strpos($query, 'asset') !== false) {
            $assets = $db->query("SELECT name, status FROM assets WHERE status = 'critical' LIMIT 5")->getResultArray();
            return "Critical assets: " . implode(', ', array_column($assets, 'name')) ?: "No critical assets found.";
        }
        
        if (strpos($query, 'overdue') !== false && strpos($query, 'work order') !== false) {
            $count = $db->query("SELECT COUNT(*) as count FROM work_orders WHERE due_date < NOW() AND status != 'completed'")->getRow()->count;
            return "You have $count overdue work orders.";
        }
        
        if (strpos($query, 'energy') !== false && strpos($query, 'month') !== false) {
            $energy = $db->query("SELECT SUM(consumption_kwh) as total FROM energy_consumption WHERE MONTH(timestamp) = MONTH(NOW())")->getRow();
            return "Energy consumption this month: " . number_format($energy->total ?? 0, 2) . " kWh";
        }
        
        if (strpos($query, 'maintenance cost') !== false) {
            $costs = $db->query("SELECT a.name, SUM(w.cost) as total FROM work_orders w JOIN assets a ON w.asset_id = a.id GROUP BY w.asset_id ORDER BY total DESC LIMIT 5")->getResultArray();
            $result = "Top maintenance costs:\n";
            foreach ($costs as $c) {
                $result .= "- {$c['name']}: $" . number_format($c['total'], 2) . "\n";
            }
            return $result;
        }
        
        if (strpos($query, 'pm') !== false || strpos($query, 'preventive') !== false) {
            $count = $db->query("SELECT COUNT(*) as count FROM work_orders WHERE work_type = 'preventive' AND status = 'open'")->getRow()->count;
            return "You have $count assets needing preventive maintenance.";
        }
        
        return "I can help you with:\n- Critical assets status\n- Overdue work orders\n- Energy consumption\n- Maintenance costs\n- PM schedules\n\nTry asking: 'Show critical assets' or 'List overdue work orders'";
    }

    public function recommendations()
    {
        $db = \Config\Database::connect();
        
        $recommendations = [];
        
        $overdueWO = $db->query("SELECT COUNT(*) as count FROM work_orders WHERE due_date < NOW() AND status != 'completed'")->getRow()->count;
        if ($overdueWO > 0) {
            $recommendations[] = [
                'type' => 'urgent',
                'title' => 'Overdue Work Orders',
                'message' => "$overdueWO work orders are overdue. Review and prioritize immediately.",
                'action' => '/admin/work-orders'
            ];
        }
        
        $lowStock = $db->query("SELECT COUNT(*) as count FROM inventory WHERE quantity <= reorder_point")->getRow()->count;
        if ($lowStock > 0) {
            $recommendations[] = [
                'type' => 'warning',
                'title' => 'Low Stock Items',
                'message' => "$lowStock items are at or below reorder point.",
                'action' => '/admin/inventory-forecast'
            ];
        }
        
        $criticalNC = $db->query("SELECT COUNT(*) as count FROM non_conformances WHERE severity = 'critical' AND status = 'open'")->getRow()->count;
        if ($criticalNC > 0) {
            $recommendations[] = [
                'type' => 'critical',
                'title' => 'Critical Quality Issues',
                'message' => "$criticalNC critical non-conformances need attention.",
                'action' => '/admin/quality'
            ];
        }
        
        return $this->respond(['status' => 'success', 'data' => $recommendations]);
    }
}
