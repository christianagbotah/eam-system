<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;
use App\Libraries\EamMetrics;

class MetricsController extends ResourceController
{
    protected $format = 'json';

    public function dashboard()
    {
        $metrics = new EamMetrics();
        $db = \Config\Database::connect();

        // Overall statistics
        $stats = [
            'total_assets' => $db->table('assets_unified')->countAllResults(),
            'active_work_orders' => $db->table('work_orders')->whereIn('status', ['open', 'assigned', 'in_progress'])->countAllResults(),
            'overdue_pm' => $db->table('pm_schedules')->where('status', 'overdue')->countAllResults(),
            'low_stock_items' => $db->query("SELECT COUNT(*) as count FROM inventory_items WHERE quantity <= reorder_point AND reorder_point > 0")->getRow()->count,
            'pm_compliance' => round($metrics->calculatePMCompliance(date('Y-m-01'), date('Y-m-t')), 2)
        ];

        return $this->respond([
            'status' => 'success',
            'data' => $stats
        ]);
    }

    public function assetMetrics($assetId)
    {
        $metrics = new EamMetrics();

        $data = [
            'mtbf' => round($metrics->calculateMTBF($assetId), 2),
            'mttr' => round($metrics->calculateMTTR($assetId), 2),
            'availability' => round($metrics->calculateAvailability($assetId), 2),
            'maintenance_cost' => $metrics->getMaintenanceCost($assetId)
        ];

        return $this->respond([
            'status' => 'success',
            'data' => $data
        ]);
    }
}
