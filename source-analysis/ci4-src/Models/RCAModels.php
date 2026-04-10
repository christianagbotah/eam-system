<?php

namespace App\Models;

use CodeIgniter\Model;

class RCA5WhysModel extends Model
{
    protected $table = 'rca_5whys';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = ['asset_id', 'problem_statement', 'why1', 'why2', 'why3', 'why4', 'why5', 'root_cause', 'created_by'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'asset_id' => 'required|integer',
        'problem_statement' => 'required|min_length[10]'
    ];
}

class RCAFishboneModel extends Model
{
    protected $table = 'rca_fishbone';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['asset_id', 'problem_statement', 'people', 'process', 'equipment', 'materials', 'environment', 'management', 'created_by'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    
    protected $beforeInsert = ['jsonEncode'];
    protected $beforeUpdate = ['jsonEncode'];
    protected $afterFind = ['jsonDecode'];
    
    protected function jsonEncode(array $data)
    {
        $fields = ['people', 'process', 'equipment', 'materials', 'environment', 'management'];
        foreach ($fields as $field) {
            if (isset($data['data'][$field]) && is_array($data['data'][$field])) {
                $data['data'][$field] = json_encode($data['data'][$field]);
            }
        }
        return $data;
    }
    
    protected function jsonDecode(array $data)
    {
        $fields = ['people', 'process', 'equipment', 'materials', 'environment', 'management'];
        if (isset($data['data'])) {
            foreach ($fields as $field) {
                if (isset($data['data'][$field])) {
                    $data['data'][$field] = json_decode($data['data'][$field], true);
                }
            }
        }
        return $data;
    }
}

class FailureModeModel extends Model
{
    protected $table = 'failure_modes';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['code', 'name', 'category', 'description', 'severity', 'occurrence', 'detection', 'rpn'];
    protected $useTimestamps = true;
    protected $validationRules = [
        'code' => 'required|is_unique[failure_modes.code]|max_length[50]',
        'name' => 'required|max_length[255]',
        'severity' => 'required|integer|greater_than[0]|less_than[11]',
        'occurrence' => 'required|integer|greater_than[0]|less_than[11]',
        'detection' => 'required|integer|greater_than[0]|less_than[11]'
    ];
    
    protected $beforeInsert = ['calculateRPN'];
    protected $beforeUpdate = ['calculateRPN'];
    
    protected function calculateRPN(array $data)
    {
        if (isset($data['data']['severity']) && isset($data['data']['occurrence']) && isset($data['data']['detection'])) {
            $data['data']['rpn'] = $data['data']['severity'] * $data['data']['occurrence'] * $data['data']['detection'];
        }
        return $data;
    }
}

class RCMAssessmentModel extends Model
{
    protected $table = 'rcm_assessments';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['asset_id', 'safety_score', 'production_score', 'quality_score', 'environmental_score', 'cost_score', 'total_score', 'criticality_level', 'maintenance_strategy'];
    protected $useTimestamps = true;
    
    protected $beforeInsert = ['calculateCriticality'];
    protected $beforeUpdate = ['calculateCriticality'];
    
    protected function calculateCriticality(array $data)
    {
        if (isset($data['data'])) {
            $total = ($data['data']['safety_score'] ?? 0) + 
                    ($data['data']['production_score'] ?? 0) + 
                    ($data['data']['quality_score'] ?? 0) + 
                    ($data['data']['environmental_score'] ?? 0) + 
                    ($data['data']['cost_score'] ?? 0);
            
            $data['data']['total_score'] = $total;
            
            if ($total >= 35) {
                $data['data']['criticality_level'] = 'critical';
                $data['data']['maintenance_strategy'] = 'predictive';
            } elseif ($total >= 25) {
                $data['data']['criticality_level'] = 'high';
                $data['data']['maintenance_strategy'] = 'preventive';
            } elseif ($total >= 15) {
                $data['data']['criticality_level'] = 'medium';
                $data['data']['maintenance_strategy'] = 'preventive';
            } else {
                $data['data']['criticality_level'] = 'low';
                $data['data']['maintenance_strategy'] = 'corrective';
            }
        }
        return $data;
    }
}

class PartsOptimizationModel extends Model
{
    protected $table = 'parts_optimization';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['part_id', 'abc_class', 'xyz_class', 'annual_usage', 'unit_cost', 'annual_cost', 'eoq', 'rop', 'current_stock'];
    protected $useTimestamps = true;
    
    protected $beforeInsert = ['calculateMetrics'];
    protected $beforeUpdate = ['calculateMetrics'];
    
    protected function calculateMetrics(array $data)
    {
        if (isset($data['data']['annual_usage']) && isset($data['data']['unit_cost'])) {
            $data['data']['annual_cost'] = $data['data']['annual_usage'] * $data['data']['unit_cost'];
            
            // EOQ = sqrt((2 * D * S) / H) - simplified
            $orderingCost = 50; // Default
            $holdingCost = $data['data']['unit_cost'] * 0.25; // 25% of unit cost
            $data['data']['eoq'] = (int) sqrt((2 * $data['data']['annual_usage'] * $orderingCost) / $holdingCost);
            
            // ROP = (D * L) + SS - simplified
            $leadTime = 7; // days
            $dailyUsage = $data['data']['annual_usage'] / 365;
            $data['data']['rop'] = (int) ($dailyUsage * $leadTime * 1.5); // 1.5 = safety factor
        }
        return $data;
    }
}

class KPISnapshotModel extends Model
{
    protected $table = 'kpi_snapshots';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['snapshot_date', 'mtbf', 'mttr', 'oee', 'pm_compliance', 'reactive_ratio', 'cost_per_asset', 'schedule_compliance', 'wrench_time'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = null;
}
