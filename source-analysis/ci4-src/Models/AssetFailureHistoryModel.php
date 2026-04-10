<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Enterprise-Grade Asset Failure History Model
 * Tracks failures for reliability analysis and predictive maintenance
 */
class AssetFailureHistoryModel extends Model
{
    protected $table = 'asset_failure_history';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'asset_id', 'asset_type', 'work_order_id', 'failure_date',
        'failure_code_id', 'failure_description', 'root_cause',
        'corrective_action', 'downtime_hours', 'mtbf_hours',
        'mttr_hours', 'failure_severity', 'recurrence_count',
        'cost_impact', 'recorded_by'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';

    /**
     * Get failure history for asset
     */
    public function getAssetFailures($assetId, $assetType = null, $limit = 50)
    {
        $builder = $this->select('asset_failure_history.*, fc.failure_name, fc.failure_code, 
                                 wo.work_order_number, u.full_name as recorded_by_name')
            ->join('failure_codes fc', 'fc.id = asset_failure_history.failure_code_id', 'left')
            ->join('work_orders wo', 'wo.id = asset_failure_history.work_order_id', 'left')
            ->join('users u', 'u.id = asset_failure_history.recorded_by', 'left')
            ->where('asset_failure_history.asset_id', $assetId);

        if ($assetType) {
            $builder->where('asset_failure_history.asset_type', $assetType);
        }

        return $builder->orderBy('asset_failure_history.failure_date', 'DESC')
            ->limit($limit)
            ->findAll();
    }

    /**
     * Calculate reliability metrics
     */
    public function getReliabilityMetrics($assetId, $assetType = null)
    {
        $builder = $this->select('COUNT(*) as failure_count,
                                 AVG(mtbf_hours) as avg_mtbf,
                                 AVG(mttr_hours) as avg_mttr,
                                 SUM(downtime_hours) as total_downtime,
                                 SUM(cost_impact) as total_cost,
                                 MAX(failure_date) as last_failure')
            ->where('asset_id', $assetId);

        if ($assetType) {
            $builder->where('asset_type', $assetType);
        }

        return $builder->get()->getRowArray();
    }

    /**
     * Get recurring failures
     */
    public function getRecurringFailures($threshold = 3)
    {
        return $this->select('asset_id, asset_type, failure_code_id, 
                             COUNT(*) as occurrence_count,
                             AVG(mttr_hours) as avg_repair_time,
                             SUM(cost_impact) as total_cost')
            ->groupBy('asset_id, asset_type, failure_code_id')
            ->having('occurrence_count >=', $threshold)
            ->orderBy('occurrence_count', 'DESC')
            ->findAll();
    }

    /**
     * Get critical failures
     */
    public function getCriticalFailures($days = 30)
    {
        $date = date('Y-m-d', strtotime("-{$days} days"));
        
        return $this->select('asset_failure_history.*, fc.failure_name')
            ->join('failure_codes fc', 'fc.id = asset_failure_history.failure_code_id', 'left')
            ->where('failure_severity', 'critical')
            ->where('failure_date >=', $date)
            ->orderBy('failure_date', 'DESC')
            ->findAll();
    }
}
