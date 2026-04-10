<?php

namespace App\Models;

class WorkOrderModel extends PlantScopedModel
{
    protected $table = 'work_orders';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    
    protected $allowedFields = [
        // Plant & Facility
        'plant_id',
        // Core Work Order Fields
        'wo_number', 'asset_id', 'wo_type', 'priority', 'status', 'title', 'description',
        
        // Request & Assignment
        'maintenance_request_id', 'requested_by', 'assigned_to', 'assigned_supervisor_id', 
        'assigned_group_id', 'lead_technician_id', 'department_id', 'trade_required', 
        'assigned_by', 'assigned_at',
        
        // Scheduling
        'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
        
        // Time & Cost Tracking
        'estimated_hours', 'actual_hours', 'estimated_cost', 'actual_cost', 
        'labor_cost', 'material_cost', 'contractor_cost',
        
        // Downtime Tracking
        'downtime_start', 'downtime_end', 'downtime_minutes', 'response_time_minutes',
        
        // Work Details
        'failure_description', 'work_performed', 'completion_notes', 'safety_notes',
        
        // Permits & Approvals
        'requires_shutdown', 'requires_permit', 'permit_number',
        
        // Workflow
        'created_by', 'approved_by', 'verified_by', 'closed_by',
        
        // Enterprise RWOP Fields
        'verification_required', 'verification_status', 'waiting_reason', 'reopen_count',
        'sla_due_date', 'sla_breach_flag',
        'cost_locked', 'cost_locked_by', 'cost_locked_at',
        'rca_required', 'rca_completed', 'rca_summary', 'rca_completed_by', 'rca_completed_at',
        'reopen_requires_approval', 'reopen_approved_by', 'reopen_approved_at'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'wo_number' => 'required|is_unique[work_orders.wo_number]',
        'asset_id' => 'required|integer',
        'wo_type' => 'required|in_list[preventive,corrective,predictive,inspection,project,emergency]',
        'priority' => 'required|in_list[low,medium,high,critical,emergency]',
        'title' => 'required|min_length[3]|max_length[255]',
        'department_id' => 'required|integer'
    ];

    public function generateWorkOrderNumber()
    {
        $prefix = 'WO';
        $year = date('Y');
        $month = date('m');
        
        // Get last work order number for current month
        $lastWO = $this->where('wo_number LIKE', "{$prefix}-{$year}{$month}%")
                       ->orderBy('wo_number', 'DESC')
                       ->first();
        
        if ($lastWO) {
            $lastNumber = intval(substr($lastWO['wo_number'], -4));
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return sprintf('%s-%s%s-%04d', $prefix, $year, $month, $newNumber);
    }

    public function getWorkOrdersWithDetails($filters = [])
    {
        $builder = $this->db->table($this->table . ' wo');
        
        $builder->select('
            wo.*,
            a.name as asset_name,
            a.asset_number,
            d.name as department_name,
            u1.full_name as requested_by_name,
            u2.full_name as assigned_to_name,
            u3.full_name as lead_technician_name,
            wg.name as work_group_name,
            t.name as trade_name,
            COUNT(wol.id) as technician_count,
            SUM(wom.total_cost) as total_material_cost
        ');
        
        $builder->join('assets a', 'a.id = wo.asset_id', 'left');
        $builder->join('departments d', 'd.id = wo.department_id', 'left');
        $builder->join('users u1', 'u1.id = wo.requested_by', 'left');
        $builder->join('users u2', 'u2.id = wo.assigned_to', 'left');
        $builder->join('users u3', 'u3.id = wo.lead_technician_id', 'left');
        $builder->join('work_groups wg', 'wg.id = wo.assigned_group_id', 'left');
        $builder->join('trades t', 't.id = wo.trade_required', 'left');
        $builder->join('work_order_labor wol', 'wol.work_order_id = wo.id', 'left');
        $builder->join('work_order_materials wom', 'wom.work_order_id = wo.id', 'left');
        
        // Apply filters
        if (!empty($filters['status'])) {
            $builder->where('wo.status', $filters['status']);
        }
        
        if (!empty($filters['priority'])) {
            $builder->where('wo.priority', $filters['priority']);
        }
        
        if (!empty($filters['department_id'])) {
            $builder->where('wo.department_id', $filters['department_id']);
        }
        
        if (!empty($filters['assigned_to'])) {
            $builder->where('wo.assigned_to', $filters['assigned_to']);
        }
        
        if (!empty($filters['date_from'])) {
            $builder->where('wo.created_at >=', $filters['date_from']);
        }
        
        if (!empty($filters['date_to'])) {
            $builder->where('wo.created_at <=', $filters['date_to']);
        }
        
        $builder->groupBy('wo.id');
        $builder->orderBy('wo.created_at', 'DESC');
        
        return $builder->get()->getResultArray();
    }

    public function getWorkOrderWithFullDetails($id)
    {
        $workOrder = $this->getWorkOrdersWithDetails(['id' => $id]);
        
        if (empty($workOrder)) {
            return null;
        }
        
        $workOrder = $workOrder[0];
        
        // Get labor details
        $workOrder['labor'] = $this->db->table('work_order_labor wol')
            ->select('wol.*, u.full_name, u.employee_number, t.name as trade_name')
            ->join('users u', 'u.id = wol.technician_id')
            ->join('trades t', 't.id = u.trade_id', 'left')
            ->where('wol.work_order_id', $id)
            ->get()->getResultArray();
        
        // Get time tracking
        $workOrder['time_tracking'] = $this->db->table('work_order_time_tracking wott')
            ->select('wott.*, u.full_name')
            ->join('users u', 'u.id = wott.technician_id')
            ->where('wott.work_order_id', $id)
            ->orderBy('wott.timestamp', 'ASC')
            ->get()->getResultArray();
        
        // Get materials
        $workOrder['materials'] = $this->db->table('work_order_materials wom')
            ->select('wom.*, u1.full_name as requested_by_name, u2.full_name as issued_by_name')
            ->join('users u1', 'u1.id = wom.requested_by', 'left')
            ->join('users u2', 'u2.id = wom.issued_by', 'left')
            ->where('wom.work_order_id', $id)
            ->get()->getResultArray();
        
        // Get status history
        $workOrder['status_history'] = $this->db->table('work_order_status_history wosh')
            ->select('wosh.*, u.full_name as changed_by_name')
            ->join('users u', 'u.id = wosh.changed_by')
            ->where('wosh.work_order_id', $id)
            ->orderBy('wosh.timestamp', 'ASC')
            ->get()->getResultArray();
        
        // Get failure codes
        $workOrder['failure_codes'] = $this->db->table('work_order_failure_codes wofc')
            ->select('wofc.*, fc.code, fc.description as failure_description, fc.category')
            ->join('failure_codes fc', 'fc.id = wofc.failure_code_id')
            ->where('wofc.work_order_id', $id)
            ->get()->getResultArray();
        
        // Get attachments
        $workOrder['attachments'] = $this->db->table('work_order_attachments')
            ->where('work_order_id', $id)
            ->get()->getResultArray();
        
        return $workOrder;
    }

    public function getDowntimeReport($dateFrom, $dateTo)
    {
        $builder = $this->db->table($this->table . ' wo');
        
        $builder->select('
            a.name as asset_name,
            a.asset_number,
            d.name as department_name,
            wo.wo_number,
            wo.title,
            wo.downtime_start,
            wo.downtime_end,
            wo.downtime_minutes,
            wo.priority,
            wo.wo_type,
            fc.category as failure_category
        ');
        
        $builder->join('assets a', 'a.id = wo.asset_id');
        $builder->join('departments d', 'd.id = wo.department_id');
        $builder->join('work_order_failure_codes wofc', 'wofc.work_order_id = wo.id', 'left');
        $builder->join('failure_codes fc', 'fc.id = wofc.failure_code_id AND wofc.is_primary = 1', 'left');
        
        $builder->where('wo.downtime_minutes >', 0);
        
        if ($dateFrom) {
            $builder->where('wo.created_at >=', $dateFrom);
        }
        
        if ($dateTo) {
            $builder->where('wo.created_at <=', $dateTo);
        }
        
        $builder->orderBy('wo.downtime_minutes', 'DESC');
        
        return $builder->get()->getResultArray();
    }

    public function getResponseTimeReport($dateFrom, $dateTo)
    {
        $builder = $this->db->table($this->table . ' wo');
        
        $builder->select('
            wo.wo_number,
            wo.title,
            wo.priority,
            wo.created_at,
            wo.actual_start,
            wo.response_time_minutes,
            a.name as asset_name,
            d.name as department_name,
            u.full_name as assigned_to_name
        ');
        
        $builder->join('assets a', 'a.id = wo.asset_id');
        $builder->join('departments d', 'd.id = wo.department_id');
        $builder->join('users u', 'u.id = wo.assigned_to', 'left');
        
        $builder->where('wo.response_time_minutes IS NOT NULL');
        
        if ($dateFrom) {
            $builder->where('wo.created_at >=', $dateFrom);
        }
        
        if ($dateTo) {
            $builder->where('wo.created_at <=', $dateTo);
        }
        
        $builder->orderBy('wo.response_time_minutes', 'DESC');
        
        return $builder->get()->getResultArray();
    }

    public function getManHoursReport($dateFrom, $dateTo)
    {
        $builder = $this->db->table('work_order_labor wol');
        
        $builder->select('
            wo.wo_number,
            wo.title,
            wo.wo_type,
            a.name as asset_name,
            d.name as department_name,
            u.full_name as technician_name,
            t.name as trade_name,
            wol.hours_worked,
            wol.overtime_hours,
            wol.hourly_rate,
            wol.labor_cost,
            wo.actual_start,
            wo.actual_end
        ');
        
        $builder->join('work_orders wo', 'wo.id = wol.work_order_id');
        $builder->join('assets a', 'a.id = wo.asset_id');
        $builder->join('departments d', 'd.id = wo.department_id');
        $builder->join('users u', 'u.id = wol.technician_id');
        $builder->join('trades t', 't.id = u.trade_id', 'left');
        
        if ($dateFrom) {
            $builder->where('wo.created_at >=', $dateFrom);
        }
        
        if ($dateTo) {
            $builder->where('wo.created_at <=', $dateTo);
        }
        
        $builder->orderBy('wol.hours_worked', 'DESC');
        
        return $builder->get()->getResultArray();
    }

    public function getMaterialUsageReport($dateFrom, $dateTo)
    {
        $builder = $this->db->table('work_order_materials wom');
        
        $builder->select('
            wo.wo_number,
            wo.title,
            a.name as asset_name,
            wom.part_number,
            wom.description,
            wom.quantity_requested,
            wom.quantity_used,
            wom.unit_cost,
            wom.total_cost,
            wom.status
        ');
        
        $builder->join('work_orders wo', 'wo.id = wom.work_order_id');
        $builder->join('assets a', 'a.id = wo.asset_id');
        
        if ($dateFrom) {
            $builder->where('wo.created_at >=', $dateFrom);
        }
        
        if ($dateTo) {
            $builder->where('wo.created_at <=', $dateTo);
        }
        
        $builder->orderBy('wom.total_cost', 'DESC');
        
        return $builder->get()->getResultArray();
    }

    public function getFailureAnalysisReport($dateFrom, $dateTo)
    {
        $builder = $this->db->table('work_order_failure_codes wofc');
        
        $builder->select('
            fc.code,
            fc.description,
            fc.category,
            COUNT(*) as occurrence_count,
            AVG(wo.downtime_minutes) as avg_downtime,
            SUM(wo.actual_cost) as total_cost,
            GROUP_CONCAT(DISTINCT a.name) as affected_assets
        ');
        
        $builder->join('failure_codes fc', 'fc.id = wofc.failure_code_id');
        $builder->join('work_orders wo', 'wo.id = wofc.work_order_id');
        $builder->join('assets a', 'a.id = wo.asset_id');
        
        if ($dateFrom) {
            $builder->where('wo.created_at >=', $dateFrom);
        }
        
        if ($dateTo) {
            $builder->where('wo.created_at <=', $dateTo);
        }
        
        $builder->groupBy('fc.id');
        $builder->orderBy('occurrence_count', 'DESC');
        
        return $builder->get()->getResultArray();
    }

    public function getDashboardStats($filters = [])
    {
        $stats = [];
        
        // Total work orders by status
        $builder = $this->db->table($this->table);
        if (!empty($filters['department_id'])) {
            $builder->where('department_id', $filters['department_id']);
        }
        
        $stats['by_status'] = $builder->select('status, COUNT(*) as count')
                                    ->groupBy('status')
                                    ->get()->getResultArray();
        
        // Work orders by priority
        $builder = $this->db->table($this->table);
        if (!empty($filters['department_id'])) {
            $builder->where('department_id', $filters['department_id']);
        }
        
        $stats['by_priority'] = $builder->select('priority, COUNT(*) as count')
                                      ->groupBy('priority')
                                      ->get()->getResultArray();
        
        // Overdue work orders
        $stats['overdue'] = $this->where('scheduled_end <', date('Y-m-d H:i:s'))
                                ->where('status NOT IN', ['completed', 'closed', 'cancelled'])
                                ->countAllResults();
        
        // Average response time (last 30 days)
        $stats['avg_response_time'] = $this->where('created_at >=', date('Y-m-d', strtotime('-30 days')))
                                          ->where('response_time_minutes IS NOT NULL')
                                          ->selectAvg('response_time_minutes')
                                          ->get()->getRow()->response_time_minutes ?? 0;
        
        // Total downtime (last 30 days)
        $stats['total_downtime'] = $this->where('created_at >=', date('Y-m-d', strtotime('-30 days')))
                                       ->selectSum('downtime_minutes')
                                       ->get()->getRow()->downtime_minutes ?? 0;
        
        return $stats;
    }

    public function getWorkOrderTimeline($id)
    {
        $timeline = [];
        
        // Get status history
        $statusHistory = $this->db->table('work_order_status_history wosh')
            ->select('wosh.*, u.full_name as changed_by_name')
            ->join('users u', 'u.id = wosh.changed_by')
            ->where('wosh.work_order_id', $id)
            ->orderBy('wosh.timestamp', 'ASC')
            ->get()->getResultArray();
        
        foreach ($statusHistory as $status) {
            $timeline[] = [
                'type' => 'status_change',
                'timestamp' => $status['timestamp'],
                'description' => "Status changed from {$status['from_status']} to {$status['to_status']}",
                'user' => $status['changed_by_name'],
                'details' => $status['reason']
            ];
        }
        
        // Get time tracking events
        $timeTracking = $this->db->table('work_order_time_tracking wott')
            ->select('wott.*, u.full_name')
            ->join('users u', 'u.id = wott.technician_id')
            ->where('wott.work_order_id', $id)
            ->orderBy('wott.timestamp', 'ASC')
            ->get()->getResultArray();
        
        foreach ($timeTracking as $time) {
            $timeline[] = [
                'type' => 'time_tracking',
                'timestamp' => $time['timestamp'],
                'description' => ucfirst($time['action_type']) . ' work',
                'user' => $time['full_name'],
                'details' => $time['notes']
            ];
        }
        
        // Sort timeline by timestamp
        usort($timeline, function($a, $b) {
            return strtotime($a['timestamp']) - strtotime($b['timestamp']);
        });
        
        return $timeline;
    }
}