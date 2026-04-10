<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderLaborModel extends Model
{
    protected $table = 'work_order_labor';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    
    protected $allowedFields = [
        'work_order_id', 'technician_id', 'is_lead', 'start_time', 'end_time',
        'hours_worked', 'hourly_rate', 'labor_cost', 'overtime_hours',
        'overtime_rate', 'notes', 'added_by'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function getLaborSummary($workOrderId)
    {
        return $this->select('
            wol.*,
            u.full_name,
            u.employee_number,
            t.name as trade_name,
            t.hourly_rate as trade_rate
        ')
        ->join('users u', 'u.id = wol.technician_id')
        ->join('trades t', 't.id = u.trade_id', 'left')
        ->where('wol.work_order_id', $workOrderId)
        ->findAll();
    }
}

class WorkOrderTimeTrackingModel extends Model
{
    protected $table = 'work_order_time_tracking';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    
    protected $allowedFields = [
        'work_order_id', 'technician_id', 'action_type', 'timestamp',
        'notes', 'location'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';

    public function getTimelineForWorkOrder($workOrderId)
    {
        return $this->select('
            wott.*,
            u.full_name,
            u.employee_number
        ')
        ->join('users u', 'u.id = wott.technician_id')
        ->where('wott.work_order_id', $workOrderId)
        ->orderBy('wott.timestamp', 'ASC')
        ->findAll();
    }
}

class WorkOrderMaterialsModel extends Model
{
    protected $table = 'work_order_materials';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    
    protected $allowedFields = [
        'work_order_id', 'inventory_item_id', 'part_number', 'description',
        'quantity_requested', 'quantity_used', 'unit_cost', 'total_cost',
        'requested_by', 'issued_by', 'issued_at', 'status', 'notes'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function getMaterialsForWorkOrder($workOrderId)
    {
        return $this->select('
            wom.*,
            u1.full_name as requested_by_name,
            u2.full_name as issued_by_name,
            ii.item_name,
            ii.current_stock
        ')
        ->join('users u1', 'u1.id = wom.requested_by', 'left')
        ->join('users u2', 'u2.id = wom.issued_by', 'left')
        ->join('inventory_items ii', 'ii.id = wom.inventory_item_id', 'left')
        ->where('wom.work_order_id', $workOrderId)
        ->findAll();
    }
}

class MaintenanceKpiModel extends Model
{
    protected $table = 'maintenance_kpis';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    
    protected $allowedFields = [
        'asset_id', 'department_id', 'period_start', 'period_end',
        'total_work_orders', 'completed_work_orders', 'emergency_work_orders',
        'preventive_work_orders', 'corrective_work_orders', 'total_downtime_minutes',
        'total_labor_hours', 'total_labor_cost', 'total_material_cost',
        'avg_response_time_minutes', 'mtbf_hours', 'mttr_hours', 'availability_percentage'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function updateKPIsForWorkOrder($workOrder)
    {
        $assetId = $workOrder['asset_id'];
        $departmentId = $workOrder['department_id'];
        $periodStart = date('Y-m-01'); // Current month start
        $periodEnd = date('Y-m-t'); // Current month end
        
        // Get or create KPI record
        $kpi = $this->where([
            'asset_id' => $assetId,
            'department_id' => $departmentId,
            'period_start' => $periodStart,
            'period_end' => $periodEnd
        ])->first();
        
        if (!$kpi) {
            $kpi = [
                'asset_id' => $assetId,
                'department_id' => $departmentId,
                'period_start' => $periodStart,
                'period_end' => $periodEnd
            ];
            $kpiId = $this->insert($kpi);
        } else {
            $kpiId = $kpi['id'];
        }
        
        // Recalculate KPIs for the period
        $this->recalculateKPIs($kpiId, $assetId, $departmentId, $periodStart, $periodEnd);
    }
    
    private function recalculateKPIs($kpiId, $assetId, $departmentId, $periodStart, $periodEnd)
    {
        $db = \Config\Database::connect();
        
        // Get work order statistics
        $woStats = $db->table('work_orders')
            ->select('
                COUNT(*) as total_work_orders,
                SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed_work_orders,
                SUM(CASE WHEN priority = "emergency" THEN 1 ELSE 0 END) as emergency_work_orders,
                SUM(CASE WHEN wo_type = "preventive" THEN 1 ELSE 0 END) as preventive_work_orders,
                SUM(CASE WHEN wo_type = "corrective" THEN 1 ELSE 0 END) as corrective_work_orders,
                SUM(downtime_minutes) as total_downtime_minutes,
                SUM(actual_hours) as total_labor_hours,
                SUM(labor_cost) as total_labor_cost,
                SUM(material_cost) as total_material_cost,
                AVG(response_time_minutes) as avg_response_time_minutes
            ')
            ->where('asset_id', $assetId)
            ->where('created_at >=', $periodStart)
            ->where('created_at <=', $periodEnd . ' 23:59:59')
            ->get()->getRowArray();
        
        // Calculate MTBF and MTTR
        $mtbfMttr = $this->calculateMTBFMTTR($assetId, $periodStart, $periodEnd);
        
        // Calculate availability
        $availability = $this->calculateAvailability($assetId, $periodStart, $periodEnd);
        
        // Update KPI record
        $updateData = array_merge($woStats, [
            'mtbf_hours' => $mtbfMttr['mtbf'],
            'mttr_hours' => $mtbfMttr['mttr'],
            'availability_percentage' => $availability
        ]);
        
        $this->update($kpiId, $updateData);
    }
    
    private function calculateMTBFMTTR($assetId, $periodStart, $periodEnd)
    {
        $db = \Config\Database::connect();
        
        // Get failure work orders
        $failures = $db->table('work_orders')
            ->where('asset_id', $assetId)
            ->where('wo_type IN', ['corrective', 'emergency'])
            ->where('status', 'completed')
            ->where('created_at >=', $periodStart)
            ->where('created_at <=', $periodEnd . ' 23:59:59')
            ->orderBy('actual_end', 'ASC')
            ->get()->getResultArray();
        
        if (count($failures) < 2) {
            return ['mtbf' => 0, 'mttr' => 0];
        }
        
        // Calculate MTBF (Mean Time Between Failures)
        $totalTimeBetweenFailures = 0;
        for ($i = 1; $i < count($failures); $i++) {
            $timeBetween = strtotime($failures[$i]['actual_start']) - strtotime($failures[$i-1]['actual_end']);
            $totalTimeBetweenFailures += $timeBetween / 3600; // Convert to hours
        }
        $mtbf = $totalTimeBetweenFailures / (count($failures) - 1);
        
        // Calculate MTTR (Mean Time To Repair)
        $totalRepairTime = 0;
        foreach ($failures as $failure) {
            if ($failure['actual_start'] && $failure['actual_end']) {
                $repairTime = strtotime($failure['actual_end']) - strtotime($failure['actual_start']);
                $totalRepairTime += $repairTime / 3600; // Convert to hours
            }
        }
        $mttr = count($failures) > 0 ? $totalRepairTime / count($failures) : 0;
        
        return ['mtbf' => round($mtbf, 2), 'mttr' => round($mttr, 2)];
    }
    
    private function calculateAvailability($assetId, $periodStart, $periodEnd)
    {
        $db = \Config\Database::connect();
        
        // Get total downtime for the period
        $totalDowntime = $db->table('work_orders')
            ->selectSum('downtime_minutes')
            ->where('asset_id', $assetId)
            ->where('created_at >=', $periodStart)
            ->where('created_at <=', $periodEnd . ' 23:59:59')
            ->get()->getRow()->downtime_minutes ?? 0;
        
        // Calculate total period time in minutes
        $periodStartTime = strtotime($periodStart);
        $periodEndTime = strtotime($periodEnd . ' 23:59:59');
        $totalPeriodMinutes = ($periodEndTime - $periodStartTime) / 60;
        
        // Calculate availability percentage
        $availability = (($totalPeriodMinutes - $totalDowntime) / $totalPeriodMinutes) * 100;
        
        return round($availability, 2);
    }
}