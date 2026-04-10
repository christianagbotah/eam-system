<?php
namespace App\Models\RWOP;

use CodeIgniter\Model;

class RwopWoFailureAnalysisModel extends Model
{
    protected $table = 'rwop_wo_failure_analysis';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['work_order_id', 'failure_mode_id', 'failure_cause_id', 'failure_remedy_id', 'failure_classification', 'failure_severity', 'failure_description', 'root_cause_analysis', 'corrective_action', 'preventive_action', 'is_primary', 'analyzed_by', 'analyzed_at'];
    protected $useTimestamps = false;
    
    public function getByWorkOrder($workOrderId)
    {
        return $this->select('rwop_wo_failure_analysis.*, fm.name as mode_name, fc.name as cause_name, fr.name as remedy_name')
                    ->join('rwop_failure_modes fm', 'fm.id = rwop_wo_failure_analysis.failure_mode_id')
                    ->join('rwop_failure_causes fc', 'fc.id = rwop_wo_failure_analysis.failure_cause_id')
                    ->join('rwop_failure_remedies fr', 'fr.id = rwop_wo_failure_analysis.failure_remedy_id')
                    ->where('work_order_id', $workOrderId)
                    ->findAll();
    }
}
