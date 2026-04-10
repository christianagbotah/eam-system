<?php
namespace App\Models\RWOP;

use CodeIgniter\Model;

class RwopCostAdjustmentModel extends Model
{
    protected $table = 'rwop_cost_adjustments';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['work_order_id', 'adjustment_type', 'original_amount', 'adjusted_amount', 'adjustment_delta', 'reason', 'approved_by', 'adjusted_by', 'adjusted_at'];
    protected $useTimestamps = false;
    
    public function getByWorkOrder($workOrderId)
    {
        return $this->where('work_order_id', $workOrderId)
                    ->orderBy('adjusted_at', 'DESC')
                    ->findAll();
    }
    
    public function getTotalAdjustments($workOrderId)
    {
        return $this->selectSum('adjustment_delta')
                    ->where('work_order_id', $workOrderId)
                    ->first();
    }
}
