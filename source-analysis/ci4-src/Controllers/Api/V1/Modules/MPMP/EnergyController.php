<?php

namespace App\Controllers\Api\V1\Modules\MPMP;

use App\Controllers\Api\V1\BaseResourceController;

class EnergyController extends BaseResourceController
{
    protected $format = 'json';

    public function dashboard()
    {
        $start = $this->request->getGet('start') ?? date('Y-m-d', strtotime('-7 days'));
        $end = $this->request->getGet('end') ?? date('Y-m-d');
        
        $db = \Config\Database::connect();
        
        $query = "SELECT 
            SUM(consumption_kwh) as total_consumption,
            SUM(cost) as total_cost,
            MAX(peak_demand_kw) as peak_demand
        FROM energy_consumption
        WHERE timestamp BETWEEN ? AND ?";
        
        $summary = $db->query($query, [$start, $end])->getRow();
        
        $carbonFactor = 0.5;
        $carbonFootprint = $summary->total_consumption * $carbonFactor;
        
        $byAsset = $db->query("SELECT 
            a.name as asset_name,
            SUM(e.consumption_kwh) as consumption,
            SUM(e.cost) as cost
        FROM energy_consumption e
        JOIN assets a ON e.asset_id = a.id
        WHERE e.timestamp BETWEEN ? AND ?
        GROUP BY e.asset_id
        ORDER BY consumption DESC
        LIMIT 10", [$start, $end])->getResultArray();
        
        $byDepartment = $db->query("SELECT 
            d.name as department,
            SUM(e.consumption_kwh) as consumption,
            SUM(e.cost) as cost
        FROM energy_consumption e
        JOIN assets a ON e.asset_id = a.id
        LEFT JOIN departments d ON a.department_id = d.id
        WHERE e.timestamp BETWEEN ? AND ?
        GROUP BY d.id
        ORDER BY consumption DESC", [$start, $end])->getResultArray();
        
        $hourlyData = $db->query("SELECT 
            DATE_FORMAT(timestamp, '%H:00') as hour,
            SUM(consumption_kwh) as consumption
        FROM energy_consumption
        WHERE timestamp BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(timestamp, '%H')
        ORDER BY hour", [$start, $end])->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => [
                'total_consumption' => $summary->total_consumption ?? 0,
                'total_cost' => $summary->total_cost ?? 0,
                'peak_demand' => $summary->peak_demand ?? 0,
                'carbon_footprint' => $carbonFootprint,
                'by_asset' => $byAsset,
                'by_department' => $byDepartment,
                'hourly_data' => $hourlyData
            ]
        ]);
    }

    public function recordConsumption()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $cost = $data['consumption_kwh'] * ($data['rate_per_kwh'] ?? 0.12);
        
        $db->table('energy_consumption')->insert([
            'asset_id' => $data['asset_id'],
            'consumption_kwh' => $data['consumption_kwh'],
            'cost' => $cost,
            'rate_per_kwh' => $data['rate_per_kwh'] ?? 0.12,
            'peak_demand_kw' => $data['peak_demand_kw'] ?? null,
            'timestamp' => $data['timestamp'] ?? date('Y-m-d H:i:s')
        ]);
        
        return $this->respondCreated(['status' => 'success', 'message' => 'Energy consumption recorded']);
    }

    public function getAssetConsumption($assetId = null)
    {
        $start = $this->request->getGet('start') ?? date('Y-m-d', strtotime('-30 days'));
        $end = $this->request->getGet('end') ?? date('Y-m-d');
        
        $db = \Config\Database::connect();
        
        $query = "SELECT 
            DATE(timestamp) as date,
            SUM(consumption_kwh) as consumption,
            SUM(cost) as cost,
            MAX(peak_demand_kw) as peak_demand
        FROM energy_consumption
        WHERE asset_id = ? AND timestamp BETWEEN ? AND ?
        GROUP BY DATE(timestamp)
        ORDER BY date";
        
        $data = $db->query($query, [$assetId, $start, $end])->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $data]);
    }

    public function setTarget()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $db->table('energy_targets')->insert([
            'asset_id' => $data['asset_id'] ?? null,
            'department_id' => $data['department_id'] ?? null,
            'target_kwh' => $data['target_kwh'],
            'target_cost' => $data['target_cost'],
            'period_start' => $data['period_start'],
            'period_end' => $data['period_end']
        ]);
        
        return $this->respondCreated(['status' => 'success', 'message' => 'Energy target set']);
    }

    public function getEfficiencyMetrics()
    {
        $db = \Config\Database::connect();
        
        $query = "SELECT 
            a.name as asset_name,
            SUM(e.consumption_kwh) as total_consumption,
            COUNT(DISTINCT DATE(e.timestamp)) as days_active,
            SUM(e.consumption_kwh) / COUNT(DISTINCT DATE(e.timestamp)) as avg_daily_consumption,
            SUM(e.cost) / SUM(e.consumption_kwh) as avg_cost_per_kwh
        FROM energy_consumption e
        JOIN assets a ON e.asset_id = a.id
        WHERE e.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY e.asset_id
        ORDER BY total_consumption DESC";
        
        $metrics = $db->query($query)->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $metrics]);
    }
}
