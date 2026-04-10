<?php
namespace App\Models\RWOP;

use CodeIgniter\Model;

class RwopWoKpiSnapshotModel extends Model
{
    protected $table = 'rwop_wo_kpi_snapshots';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'work_order_id', 'plant_id', 'asset_id', 'wo_type', 'priority',
        'created_at', 'closed_at',
        'response_time_minutes', 'resolution_time_minutes', 'work_duration_minutes', 'waiting_time_minutes',
        'mttr_hours', 'mtta_hours',
        'sla_due_date', 'sla_met', 'sla_breach_minutes',
        'final_labor_cost', 'final_material_cost', 'final_contractor_cost', 'final_total_cost',
        'estimated_cost', 'cost_variance', 'cost_variance_percent',
        'downtime_minutes', 'production_loss_units', 'production_loss_value',
        'technician_count', 'total_labor_hours', 'parts_count',
        'first_time_fix', 'rework_required', 'verification_passed', 'rca_completed', 'final_reopen_count',
        'failure_mode', 'failure_cause', 'failure_classification',
        'snapshot_created_by'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'snapshot_created_at';
    protected $updatedField = false;
    
    public function getByDateRange($startDate, $endDate, $filters = [])
    {
        $builder = $this->where('closed_at >=', $startDate)
                        ->where('closed_at <=', $endDate);
        
        if (isset($filters['plant_id'])) {
            $builder->where('plant_id', $filters['plant_id']);
        }
        
        if (isset($filters['asset_id'])) {
            $builder->where('asset_id', $filters['asset_id']);
        }
        
        if (isset($filters['wo_type'])) {
            $builder->where('wo_type', $filters['wo_type']);
        }
        
        return $builder->orderBy('closed_at', 'DESC')->findAll();
    }
    
    public function getAverageMTTR($filters = [])
    {
        $builder = $this->selectAvg('mttr_hours');
        
        if (isset($filters['plant_id'])) {
            $builder->where('plant_id', $filters['plant_id']);
        }
        
        return $builder->first();
    }
}
