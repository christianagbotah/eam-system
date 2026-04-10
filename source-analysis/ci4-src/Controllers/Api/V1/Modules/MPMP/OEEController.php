<?php

namespace App\Controllers\Api\V1\Modules\MPMP;

use App\Controllers\Api\V1\BaseApiController;

class OEEController extends BaseApiController
{
    protected $format = 'json';

    public function dashboard()
    {
        // Permission check
        if (!$this->checkPermission('production', 'view')) {
            return $this->failForbidden('Insufficient permissions to view OEE dashboard');
        }

        $assetId = $this->request->getGet('asset_id');
        $startDate = $this->request->getGet('start_date') ?? date('Y-m-d', strtotime('-7 days'));
        $endDate = $this->request->getGet('end_date') ?? date('Y-m-d');
        
        $db = \Config\Database::connect();
        
        $query = "SELECT 
            shift_date as date,
            AVG(availability) as avg_availability,
            AVG(performance) as avg_performance,
            AVG(quality) as avg_quality,
            AVG(oee) as avg_oee
        FROM oee_metrics
        WHERE shift_date BETWEEN ? AND ?";
        
        $params = [$startDate, $endDate];
        if ($assetId) {
            $query .= " AND asset_id = ?";
            $params[] = $assetId;
        }
        
        $query .= " GROUP BY shift_date ORDER BY shift_date";
        
        $metrics = $db->query($query, $params)->getResultArray();

        // Audit log
        $this->auditLog('VIEW', 'oee_dashboard', 0, null, ['count' => count($metrics), 'start_date' => $startDate, 'end_date' => $endDate]);
        
        return $this->respond(['status' => 'success', 'data' => $metrics]);
    }

    public function realtime($assetId = null)
    {
        // Permission check
        if (!$this->checkPermission('production', 'view')) {
            return $this->failForbidden('Insufficient permissions to view realtime OEE data');
        }

        // Validate asset ownership
        if (!$this->validateResourceOwnership('assets', $assetId, 'plant_id')) {
            return $this->failForbidden('Access denied to this asset');
        }

        $db = \Config\Database::connect();
        $query = "SELECT * FROM oee_metrics WHERE asset_id = ? ORDER BY shift_date DESC, created_at DESC LIMIT 1";
        $current = $db->query($query, [$assetId])->getRowArray();

        // Audit log
        $this->auditLog('VIEW', 'oee_realtime', $assetId);
        
        return $this->respond(['status' => 'success', 'data' => $current]);
    }

    public function downtime()
    {
        // Permission check
        if (!$this->checkPermission('production', 'view')) {
            return $this->failForbidden('Insufficient permissions to view OEE downtime data');
        }

        $assetId = $this->request->getGet('asset_id');

        // Validate asset ownership
        if (!$this->validateResourceOwnership('assets', $assetId, 'plant_id')) {
            return $this->failForbidden('Access denied to this asset');
        }

        $db = \Config\Database::connect();
        
        $query = "SELECT r.reason_name, COUNT(*) as count, SUM(d.duration_minutes) as total_minutes
        FROM oee_downtime_events d
        JOIN oee_downtime_reasons r ON d.reason_id = r.id
        WHERE d.asset_id = ?
        GROUP BY r.reason_name
        ORDER BY total_minutes DESC";
        
        $downtime = $db->query($query, [$assetId])->getResultArray();

        // Audit log
        $this->auditLog('VIEW', 'oee_downtime', $assetId, null, ['count' => count($downtime)]);
        
        return $this->respond(['status' => 'success', 'data' => $downtime]);
    }
}
