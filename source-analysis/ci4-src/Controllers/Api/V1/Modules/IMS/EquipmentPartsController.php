<?php

namespace App\Controllers\Api\V1\Modules\IMS;

use App\Controllers\Api\V1\BaseApiController;

class EquipmentPartsController extends BaseApiController
{
    protected $format = 'json';

    public function getEquipmentParts($equipmentId)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'view')) {
            return $this->failForbidden('Insufficient permissions to view equipment parts');
        }

        // Validate equipment ownership
        if (!$this->validateResourceOwnership('equipment', $equipmentId, 'plant_id')) {
            return $this->failForbidden('Access denied to this equipment');
        }

        $db = \Config\Database::connect();

        $parts = $db->table('parts')
            ->select('parts.*,
                      COALESCE(meters.current_reading, 0) as current_usage,
                      COALESCE(meters.expected_life, 5000) as expected_life,
                      (SELECT MAX(completed_at) FROM work_orders WHERE asset_id = parts.id AND work_order_type = "preventive" AND status = "completed") as last_maintenance')
            ->join('assemblies', 'assemblies.id = parts.assembly_id', 'left')
            ->join('meters', 'meters.asset_id = parts.id', 'left')
            ->where('assemblies.equipment_id', $equipmentId)
            ->get()
            ->getResultArray();

        foreach ($parts as &$part) {
            $usage_percent = $part['expected_life'] > 0 ? ($part['current_usage'] / $part['expected_life']) * 100 : 0;

            if ($usage_percent >= 95) {
                $part['status'] = 'overdue';
            } elseif ($usage_percent >= 80) {
                $part['status'] = 'due_soon';
            } elseif ($part['current_usage'] > 0) {
                $part['status'] = 'good';
            } else {
                $part['status'] = 'no_pm';
            }
        }

        // Audit log
        $this->auditLog('VIEW', 'equipment_parts', 0, null, ['equipment_id' => $equipmentId, 'count' => count($parts)]);

        return $this->respond([
            'status' => 'success',
            'data' => $parts
        ]);
    }

    public function getPartHistory($partId)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'view')) {
            return $this->failForbidden('Insufficient permissions to view part history');
        }

        // Validate part ownership
        if (!$this->validateResourceOwnership('parts', $partId, 'plant_id')) {
            return $this->failForbidden('Access denied to this part');
        }

        $db = \Config\Database::connect();
        
        $history = $db->table('work_orders')
            ->select('id, work_order_type as type, completed_at as date, description')
            ->where('asset_id', $partId)
            ->where('status', 'completed')
            ->orderBy('completed_at', 'DESC')
            ->limit(10)
            ->get()
            ->getResultArray();

        // Audit log
        $this->auditLog('VIEW', 'part_history', $partId, null, ['count' => count($history)]);

        return $this->respond([
            'status' => 'success',
            'data' => $history
        ]);
    }

    public function getPartPMStatus($partId)
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'view')) {
            return $this->failForbidden('Insufficient permissions to view part PM status');
        }

        // Validate part ownership
        if (!$this->validateResourceOwnership('parts', $partId, 'plant_id')) {
            return $this->failForbidden('Access denied to this part');
        }

        $db = \Config\Database::connect();
        
        $pmRules = $db->table('pm_rules')
            ->where('asset_id', $partId)
            ->where('is_active', 1)
            ->get()
            ->getResultArray();

        $nextPM = $db->table('pm_schedules')
            ->where('asset_id', $partId)
            ->where('status', 'scheduled')
            ->orderBy('scheduled_date', 'ASC')
            ->get()
            ->getRowArray();

        // Audit log
        $this->auditLog('VIEW', 'part_pm_status', $partId, null, ['has_pm_rule' => count($pmRules) > 0]);

        return $this->respond([
            'status' => 'success',
            'data' => [
                'has_pm_rule' => count($pmRules) > 0,
                'pm_rules' => $pmRules,
                'next_pm' => $nextPM
            ]
        ]);
    }
}
