<?php

namespace App\Models;

use CodeIgniter\Model;

class MaintenanceOrderModel extends Model
{
    protected $table = 'maintenance_orders';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'order_number', 'order_type', 'title', 'description', 'asset_id', 'asset_type',
        'location', 'department_id', 'priority', 'status', 'failure_type', 'failure_code',
        'downtime_impact', 'safety_risk', 'requested_by', 'requested_date', 'approved_by',
        'approved_date', 'assigned_to', 'assigned_team', 'assigned_date', 'scheduled_start',
        'scheduled_end', 'actual_start', 'actual_end', 'estimated_hours', 'actual_hours',
        'estimated_cost', 'actual_cost', 'labor_cost', 'parts_cost', 'external_cost',
        'completion_notes', 'root_cause', 'corrective_action', 'preventive_action',
        'attachments', 'parent_order_id', 'pm_task_id', 'created_by'
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $beforeInsert = ['generateOrderNumber'];

    protected function generateOrderNumber(array $data)
    {
        if (!isset($data['data']['order_number'])) {
            $prefix = 'MO';
            $year = date('Y');
            $month = date('m');
            
            $lastOrder = $this->select('order_number')
                             ->like('order_number', $prefix . $year . $month, 'after')
                             ->orderBy('id', 'DESC')
                             ->first();
            
            if ($lastOrder && !empty($lastOrder['order_number'])) {
                $lastNumber = (int)substr($lastOrder['order_number'], -4);
                $newNumber = $lastNumber + 1;
            } else {
                $newNumber = 1;
            }
            
            $data['data']['order_number'] = $prefix . $year . $month . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
        }

        return $data;
    }

    // Get orders with full details including related data
    public function getOrdersWithDetails($filters = [])
    {
        $builder = $this->db->table($this->table . ' mo');
        $builder->select('
            mo.*,
            u1.name as requested_by_name,
            u2.name as assigned_to_name,
            u3.name as approved_by_name,
            d.name as department_name,
            COUNT(DISTINCT mol.id) as labor_count,
            COUNT(DISTINCT mop.id) as parts_count,
            COUNT(DISTINCT moc.id) as checklist_count,
            SUM(CASE WHEN moc.is_completed = 1 THEN 1 ELSE 0 END) as completed_checklist_count
        ');
        $builder->join('users u1', 'u1.id = mo.requested_by', 'left');
        $builder->join('users u2', 'u2.id = mo.assigned_to', 'left');
        $builder->join('users u3', 'u3.id = mo.approved_by', 'left');
        $builder->join('departments d', 'd.id = mo.department_id', 'left');
        $builder->join('maintenance_order_labor mol', 'mol.maintenance_order_id = mo.id', 'left');
        $builder->join('maintenance_order_parts mop', 'mop.maintenance_order_id = mo.id', 'left');
        $builder->join('maintenance_order_checklist moc', 'moc.maintenance_order_id = mo.id', 'left');

        // Apply filters
        if (!empty($filters['status'])) {
            $builder->where('mo.status', $filters['status']);
        }
        if (!empty($filters['priority'])) {
            $builder->where('mo.priority', $filters['priority']);
        }
        if (!empty($filters['order_type'])) {
            $builder->where('mo.order_type', $filters['order_type']);
        }
        if (!empty($filters['asset_id'])) {
            $builder->where('mo.asset_id', $filters['asset_id']);
        }
        if (!empty($filters['assigned_to'])) {
            $builder->where('mo.assigned_to', $filters['assigned_to']);
        }
        if (!empty($filters['date_from'])) {
            $builder->where('mo.created_at >=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $builder->where('mo.created_at <=', $filters['date_to']);
        }

        $builder->groupBy('mo.id');
        $builder->orderBy('mo.created_at', 'DESC');

        return $builder->get()->getResultArray();
    }

    // Get single order with full details
    public function getOrderWithFullDetails($id)
    {
        $order = $this->getOrdersWithDetails(['id' => $id]);
        
        if (empty($order)) {
            return null;
        }

        $order = $order[0];

        // Get labor records
        $order['labor'] = $this->db->table('maintenance_order_labor')
            ->where('maintenance_order_id', $id)
            ->get()->getResultArray();

        // Get parts
        $order['parts'] = $this->db->table('maintenance_order_parts')
            ->where('maintenance_order_id', $id)
            ->get()->getResultArray();

        // Get checklist
        $order['checklist'] = $this->db->table('maintenance_order_checklist')
            ->where('maintenance_order_id', $id)
            ->orderBy('item_order', 'ASC')
            ->get()->getResultArray();

        // Get logs
        $order['logs'] = $this->db->table('maintenance_order_logs')
            ->where('maintenance_order_id', $id)
            ->orderBy('created_at', 'DESC')
            ->get()->getResultArray();

        // Get external services
        $order['external_services'] = $this->db->table('maintenance_order_external_services')
            ->where('maintenance_order_id', $id)
            ->get()->getResultArray();

        // Get downtime records
        $order['downtime'] = $this->db->table('maintenance_order_downtime')
            ->where('maintenance_order_id', $id)
            ->get()->getResultArray();

        return $order;
    }

    // Dashboard statistics
    public function getDashboardStats()
    {
        $stats = [];

        // Total orders
        $stats['total_orders'] = $this->countAll();

        // Orders by status
        $stats['by_status'] = $this->select('status, COUNT(*) as count')
            ->groupBy('status')
            ->findAll();

        // Orders by priority
        $stats['by_priority'] = $this->select('priority, COUNT(*) as count')
            ->groupBy('priority')
            ->findAll();

        // Orders by type
        $stats['by_type'] = $this->select('order_type, COUNT(*) as count')
            ->groupBy('order_type')
            ->findAll();

        // Overdue orders
        $stats['overdue_count'] = $this->where('scheduled_end <', date('Y-m-d H:i:s'))
            ->whereIn('status', ['pending', 'assigned', 'in_progress'])
            ->countAllResults();

        // Completed this month
        $stats['completed_this_month'] = $this->where('status', 'completed')
            ->where('MONTH(actual_end)', date('m'))
            ->where('YEAR(actual_end)', date('Y'))
            ->countAllResults();

        // Average completion time (hours)
        $avgTime = $this->select('AVG(actual_hours) as avg_hours')
            ->where('status', 'completed')
            ->where('actual_hours IS NOT NULL')
            ->first();
        $stats['avg_completion_hours'] = round($avgTime['avg_hours'] ?? 0, 2);

        // Total costs
        $costs = $this->select('
            SUM(labor_cost) as total_labor_cost,
            SUM(parts_cost) as total_parts_cost,
            SUM(external_cost) as total_external_cost,
            SUM(actual_cost) as total_actual_cost
        ')->first();
        $stats['costs'] = $costs;

        // Top technicians
        $stats['top_technicians'] = $this->db->table($this->table . ' mo')
            ->select('u.name, COUNT(*) as order_count, AVG(mo.actual_hours) as avg_hours')
            ->join('users u', 'u.id = mo.assigned_to')
            ->where('mo.status', 'completed')
            ->groupBy('mo.assigned_to')
            ->orderBy('order_count', 'DESC')
            ->limit(5)
            ->get()->getResultArray();

        // Recent orders
        $stats['recent_orders'] = $this->orderBy('created_at', 'DESC')
            ->limit(10)
            ->findAll();

        return $stats;
    }

    // Get overdue orders
    public function getOverdueOrders()
    {
        return $this->where('scheduled_end <', date('Y-m-d H:i:s'))
            ->whereIn('status', ['pending', 'assigned', 'in_progress'])
            ->orderBy('scheduled_end', 'ASC')
            ->findAll();
    }

    // Get upcoming orders
    public function getUpcomingOrders($days = 7)
    {
        $endDate = date('Y-m-d H:i:s', strtotime("+{$days} days"));
        
        return $this->where('scheduled_start >=', date('Y-m-d H:i:s'))
            ->where('scheduled_start <=', $endDate)
            ->whereIn('status', ['pending', 'assigned'])
            ->orderBy('scheduled_start', 'ASC')
            ->findAll();
    }

    // Analytics
    public function getAnalytics($dateFrom = null, $dateTo = null)
    {
        $builder = $this->db->table($this->table);

        if ($dateFrom) {
            $builder->where('created_at >=', $dateFrom);
        }
        if ($dateTo) {
            $builder->where('created_at <=', $dateTo);
        }

        $analytics = [];

        // Orders over time
        $analytics['orders_over_time'] = $builder->select('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('DATE(created_at)')
            ->orderBy('date', 'ASC')
            ->get()->getResultArray();

        // Completion rate
        $total = $builder->countAllResults(false);
        $completed = $builder->where('status', 'completed')->countAllResults();
        $analytics['completion_rate'] = $total > 0 ? round(($completed / $total) * 100, 2) : 0;

        // Average response time (time from creation to assignment)
        $avgResponse = $this->select('AVG(TIMESTAMPDIFF(HOUR, created_at, assigned_date)) as avg_hours')
            ->where('assigned_date IS NOT NULL')
            ->first();
        $analytics['avg_response_time_hours'] = round($avgResponse['avg_hours'] ?? 0, 2);

        // MTTR (Mean Time To Repair)
        $mttr = $this->select('AVG(TIMESTAMPDIFF(HOUR, actual_start, actual_end)) as avg_hours')
            ->where('status', 'completed')
            ->where('actual_start IS NOT NULL')
            ->where('actual_end IS NOT NULL')
            ->first();
        $analytics['mttr_hours'] = round($mttr['avg_hours'] ?? 0, 2);

        // Cost breakdown
        $analytics['cost_breakdown'] = $this->select('
            order_type,
            SUM(labor_cost) as labor_cost,
            SUM(parts_cost) as parts_cost,
            SUM(external_cost) as external_cost,
            SUM(actual_cost) as total_cost
        ')
        ->groupBy('order_type')
        ->findAll();

        // Failure analysis
        $analytics['failure_analysis'] = $this->select('failure_type, COUNT(*) as count')
            ->where('failure_type IS NOT NULL')
            ->groupBy('failure_type')
            ->orderBy('count', 'DESC')
            ->findAll();

        return $analytics;
    }

    // Log activity
    public function logActivity($orderId, $logType, $comment, $oldValue = null, $newValue = null)
    {
        $data = [
            'maintenance_order_id' => $orderId,
            'log_type' => $logType,
            'user_id' => session()->get('user_id'),
            'user_name' => session()->get('name'),
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'comment' => $comment
        ];

        return $this->db->table('maintenance_order_logs')->insert($data);
    }

    // Export to CSV
    public function exportToCSV($orders)
    {
        $csv = "Order Number,Type,Title,Priority,Status,Asset,Requested By,Assigned To,Scheduled Start,Scheduled End,Actual Start,Actual End,Estimated Hours,Actual Hours,Estimated Cost,Actual Cost,Created At\n";

        foreach ($orders as $order) {
            $csv .= sprintf(
                '"%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s"' . "\n",
                $order['order_number'],
                $order['order_type'],
                $order['title'],
                $order['priority'],
                $order['status'],
                $order['asset_id'] ?? '',
                $order['requested_by_name'] ?? '',
                $order['assigned_to_name'] ?? '',
                $order['scheduled_start'] ?? '',
                $order['scheduled_end'] ?? '',
                $order['actual_start'] ?? '',
                $order['actual_end'] ?? '',
                $order['estimated_hours'] ?? '',
                $order['actual_hours'] ?? '',
                $order['estimated_cost'] ?? '',
                $order['actual_cost'] ?? '',
                $order['created_at']
            );
        }

        return $csv;
    }

    // Bulk update
    public function bulkUpdate($ids, $updates)
    {
        $builder = $this->db->table($this->table);
        $builder->whereIn('id', $ids);
        
        return $builder->update($updates) ? count($ids) : 0;
    }
}
