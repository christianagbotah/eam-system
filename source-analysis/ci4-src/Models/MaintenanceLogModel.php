<?php

namespace App\Models;

use CodeIgniter\Model;

class MaintenanceLogModel extends Model
{
    protected $table = 'maintenance_logs';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'equipment_id', 'maintenance_type', 'scheduled_date', 'completed_date',
        'technician_id', 'status', 'priority', 'description', 'work_performed',
        'parts_used', 'labor_hours', 'cost', 'next_maintenance_date',
        'notes', 'attachments'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'equipment_id' => 'required|is_natural_no_zero',
        'maintenance_type' => 'required|in_list[preventive,corrective,emergency,inspection]',
        'scheduled_date' => 'required|valid_date',
        'technician_id' => 'permit_empty|is_natural_no_zero',
        'priority' => 'required|in_list[low,medium,high,critical]'
    ];

    public function getMaintenanceWithDetails($id = null)
    {
        $builder = $this->db->table('maintenance_logs ml')
            ->select('ml.*, e.name as equipment_name, e.equipment_id, 
                     u.first_name, u.last_name, ec.name as category_name')
            ->join('equipment e', 'ml.equipment_id = e.id', 'left')
            ->join('users u', 'ml.technician_id = u.id', 'left')
            ->join('equipment_categories ec', 'e.category_id = ec.id', 'left');

        if ($id) {
            return $builder->where('ml.id', $id)->get()->getRowArray();
        }

        return $builder->orderBy('ml.scheduled_date', 'DESC')->get()->getResultArray();
    }

    public function getUpcomingMaintenance($days = 30)
    {
        return $this->db->table('maintenance_logs ml')
            ->select('ml.*, e.name as equipment_name, e.equipment_id, 
                     u.first_name, u.last_name')
            ->join('equipment e', 'ml.equipment_id = e.id')
            ->join('users u', 'ml.technician_id = u.id', 'left')
            ->where('ml.status', 'scheduled')
            ->where('ml.scheduled_date <=', date('Y-m-d', strtotime("+{$days} days")))
            ->orderBy('ml.scheduled_date', 'ASC')
            ->get()
            ->getResultArray();
    }

    public function getOverdueMaintenance()
    {
        return $this->db->table('maintenance_logs ml')
            ->select('ml.*, e.name as equipment_name, e.equipment_id')
            ->join('equipment e', 'ml.equipment_id = e.id')
            ->where('ml.status', 'scheduled')
            ->where('ml.scheduled_date <', date('Y-m-d'))
            ->orderBy('ml.scheduled_date', 'ASC')
            ->get()
            ->getResultArray();
    }

    public function getMaintenanceStats()
    {
        $stats = [];
        
        // Total maintenance records
        $stats['total'] = $this->countAll();
        
        // By status
        $statusCounts = $this->select('status, COUNT(*) as count')
            ->groupBy('status')
            ->findAll();
        
        $stats['by_status'] = [];
        foreach ($statusCounts as $status) {
            $stats['by_status'][$status['status']] = $status['count'];
        }
        
        // This month's completed maintenance
        $stats['this_month'] = $this->where('status', 'completed')
            ->where('MONTH(completed_date)', date('m'))
            ->where('YEAR(completed_date)', date('Y'))
            ->countAllResults();
        
        // Average completion time
        $avgTime = $this->db->query("
            SELECT AVG(DATEDIFF(completed_date, scheduled_date)) as avg_days
            FROM maintenance_logs 
            WHERE status = 'completed' AND completed_date IS NOT NULL
        ")->getRowArray();
        
        $stats['avg_completion_days'] = round($avgTime['avg_days'] ?? 0, 1);
        
        return $stats;
    }
}