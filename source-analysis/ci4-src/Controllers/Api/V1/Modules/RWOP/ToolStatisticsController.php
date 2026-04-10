<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseApiController;

class ToolStatisticsController extends BaseApiController
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    /**
     * Get tool statistics overview
     * GET /api/v1/eam/tool-statistics/overview
     */
    public function overview()
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;

            // Total tools
            $totalTools = $this->db->table('tools')
                ->where('plant_id', $plantId)
                ->where('is_active', 1)
                ->countAllResults();

            // Available tools
            $availableTools = $this->db->table('tools')
                ->where('plant_id', $plantId)
                ->where('availability_status', 'AVAILABLE')
                ->where('is_active', 1)
                ->countAllResults();

            // Tools in use
            $toolsInUse = $this->db->table('tools')
                ->where('plant_id', $plantId)
                ->whereIn('availability_status', ['ISSUED', 'IN_USE'])
                ->where('is_active', 1)
                ->countAllResults();

            // Tools under maintenance
            $toolsUnderMaintenance = $this->db->table('tools')
                ->where('plant_id', $plantId)
                ->where('availability_status', 'MAINTENANCE')
                ->where('is_active', 1)
                ->countAllResults();

            // Active requests
            $activeRequests = $this->db->table('work_order_tool_requests')
                ->where('plant_id', $plantId)
                ->whereIn('request_status', ['PENDING', 'APPROVED', 'ISSUED', 'RETURN_PENDING'])
                ->countAllResults();

            // Pending transfers
            $pendingTransfers = $this->db->table('tool_transfers')
                ->where('plant_id', $plantId)
                ->whereIn('transfer_status', ['PENDING', 'APPROVED'])
                ->countAllResults();

            return $this->respond([
                'status' => 'success',
                'data' => [
                    'total_tools' => $totalTools,
                    'available_tools' => $availableTools,
                    'tools_in_use' => $toolsInUse,
                    'tools_under_maintenance' => $toolsUnderMaintenance,
                    'active_requests' => $activeRequests,
                    'pending_transfers' => $pendingTransfers,
                    'utilization_rate' => $totalTools > 0 ? round(($toolsInUse / $totalTools) * 100, 1) : 0
                ]
            ]);
        } catch (\Exception $e) {
            return $this->fail('Failed to fetch overview: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get tool utilization by category
     * GET /api/v1/eam/tool-statistics/utilization-by-category
     */
    public function utilizationByCategory()
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;

            $data = $this->db->table('tools t')
                ->select('t.category, 
                         COUNT(*) as total_tools,
                         SUM(CASE WHEN t.availability_status IN ("ISSUED", "IN_USE") THEN 1 ELSE 0 END) as tools_in_use')
                ->where('t.plant_id', $plantId)
                ->where('t.is_active', 1)
                ->groupBy('t.category')
                ->get()->getResultArray();

            foreach ($data as &$item) {
                $item['utilization_rate'] = $item['total_tools'] > 0 ? 
                    round(($item['tools_in_use'] / $item['total_tools']) * 100, 1) : 0;
            }

            return $this->respond(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            return $this->fail('Failed to fetch utilization: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get most requested tools
     * GET /api/v1/eam/tool-statistics/most-requested
     */
    public function mostRequested()
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;

            $data = $this->db->table('work_order_tool_request_items tri')
                ->select('t.tool_name, t.tool_code, t.category, 
                         COUNT(*) as request_count,
                         SUM(tri.quantity) as total_quantity_requested')
                ->join('tools t', 't.id = tri.tool_id')
                ->join('work_order_tool_requests tr', 'tr.id = tri.tool_request_id')
                ->where('tr.plant_id', $plantId)
                ->where('tr.created_at >=', date('Y-m-d', strtotime('-30 days')))
                ->groupBy('tri.tool_id')
                ->orderBy('request_count', 'DESC')
                ->limit(10)
                ->get()->getResultArray();

            return $this->respond(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            return $this->fail('Failed to fetch most requested: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get tool request trends (last 30 days)
     * GET /api/v1/eam/tool-statistics/request-trends
     */
    public function requestTrends()
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;

            $data = $this->db->table('work_order_tool_requests')
                ->select('DATE(created_at) as date, COUNT(*) as request_count')
                ->where('plant_id', $plantId)
                ->where('created_at >=', date('Y-m-d', strtotime('-30 days')))
                ->groupBy('DATE(created_at)')
                ->orderBy('date', 'ASC')
                ->get()->getResultArray();

            return $this->respond(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            return $this->fail('Failed to fetch trends: ' . $e->getMessage(), 500);
        }
    }
}