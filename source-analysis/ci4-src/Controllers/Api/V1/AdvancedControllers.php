<?php

namespace App\Controllers\API\V1;

use App\Controllers\BaseController;
use App\Models\FailureModeModel;
use App\Models\RCMAssessmentModel;
use App\Models\PartsOptimizationModel;
use App\Models\KPISnapshotModel;

class FailureModeController extends BaseController
{
    public function index()
    {
        $model = new FailureModeModel();
        $data = $model->orderBy('rpn', 'DESC')->findAll();
        return $this->respond(['status' => 'success', 'data' => $data]);
    }
    
    public function create()
    {
        $model = new FailureModeModel();
        $data = $this->request->getJSON(true);
        
        if (!$model->validate($data)) {
            return $this->failValidationErrors($model->errors());
        }
        
        if ($model->insert($data)) {
            return $this->respondCreated(['status' => 'success', 'message' => 'Failure mode created', 'id' => $model->getInsertID()]);
        }
        
        return $this->fail('Failed to create failure mode');
    }
    
    public function update($id)
    {
        $model = new FailureModeModel();
        $data = $this->request->getJSON(true);
        
        if (!$model->find($id)) {
            return $this->failNotFound('Failure mode not found');
        }
        
        if ($model->update($id, $data)) {
            return $this->respond(['status' => 'success', 'message' => 'Failure mode updated']);
        }
        
        return $this->fail('Failed to update');
    }
    
    public function delete($id)
    {
        $model = new FailureModeModel();
        
        if (!$model->find($id)) {
            return $this->failNotFound('Failure mode not found');
        }
        
        if ($model->delete($id)) {
            return $this->respond(['status' => 'success', 'message' => 'Failure mode deleted']);
        }
        
        return $this->fail('Failed to delete');
    }
}

class RCMController extends BaseController
{
    public function index()
    {
        $model = new RCMAssessmentModel();
        $data = $model->select('rcm_assessments.*, assets.name as asset_name')
                     ->join('assets', 'assets.id = rcm_assessments.asset_id', 'left')
                     ->orderBy('total_score', 'DESC')
                     ->findAll();
        
        return $this->respond(['status' => 'success', 'data' => $data]);
    }
    
    public function create()
    {
        $model = new RCMAssessmentModel();
        $data = $this->request->getJSON(true);
        
        if ($model->insert($data)) {
            return $this->respondCreated(['status' => 'success', 'message' => 'RCM assessment created', 'id' => $model->getInsertID()]);
        }
        
        return $this->fail('Failed to create assessment');
    }
    
    public function update($id)
    {
        $model = new RCMAssessmentModel();
        $data = $this->request->getJSON(true);
        
        if (!$model->find($id)) {
            return $this->failNotFound('Assessment not found');
        }
        
        if ($model->update($id, $data)) {
            return $this->respond(['status' => 'success', 'message' => 'Assessment updated']);
        }
        
        return $this->fail('Failed to update');
    }
    
    public function getStrategies()
    {
        $db = \Config\Database::connect();
        $data = $db->query("
            SELECT 
                maintenance_strategy as strategy,
                COUNT(*) as count,
                SUM(cost_score * 100) as cost,
                SUM(production_score * 1000) as benefit
            FROM rcm_assessments
            GROUP BY maintenance_strategy
        ")->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $data]);
    }
}

class PartsOptimizationController extends BaseController
{
    public function index()
    {
        $model = new PartsOptimizationModel();
        $data = $model->select('parts_optimization.*, parts.part_number, parts.description')
                     ->join('parts', 'parts.id = parts_optimization.part_id', 'left')
                     ->orderBy('annual_cost', 'DESC')
                     ->findAll();
        
        return $this->respond(['status' => 'success', 'data' => $data]);
    }
    
    public function runAnalysis()
    {
        $db = \Config\Database::connect();
        $model = new PartsOptimizationModel();
        
        // Get all parts with usage data
        $parts = $db->query("
            SELECT 
                p.id as part_id,
                COUNT(wo.id) as annual_usage,
                p.unit_cost,
                COALESCE(i.quantity, 0) as current_stock
            FROM parts p
            LEFT JOIN work_order_parts wop ON wop.part_id = p.id
            LEFT JOIN work_orders wo ON wo.id = wop.work_order_id AND wo.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
            LEFT JOIN inventory i ON i.part_id = p.id
            GROUP BY p.id
        ")->getResultArray();
        
        // Calculate ABC classification
        $totalValue = array_sum(array_column($parts, 'annual_usage'));
        $sorted = $parts;
        usort($sorted, fn($a, $b) => ($b['annual_usage'] * $b['unit_cost']) <=> ($a['annual_usage'] * $a['unit_cost']));
        
        $cumulative = 0;
        foreach ($sorted as &$part) {
            $value = $part['annual_usage'] * $part['unit_cost'];
            $cumulative += $value;
            $percentage = ($cumulative / $totalValue) * 100;
            
            if ($percentage <= 80) {
                $part['abc_class'] = 'A';
            } elseif ($percentage <= 95) {
                $part['abc_class'] = 'B';
            } else {
                $part['abc_class'] = 'C';
            }
            
            // Simple XYZ based on usage variability
            $part['xyz_class'] = $part['annual_usage'] > 100 ? 'X' : ($part['annual_usage'] > 50 ? 'Y' : 'Z');
            
            // Insert or update
            $model->replace($part);
        }
        
        return $this->respond(['status' => 'success', 'message' => 'Analysis completed', 'processed' => count($parts)]);
    }
    
    public function getABCAnalysis()
    {
        $db = \Config\Database::connect();
        $data = $db->query("
            SELECT 
                abc_class as name,
                COUNT(*) as value,
                ROUND(SUM(annual_cost) / (SELECT SUM(annual_cost) FROM parts_optimization) * 100, 1) as percentage
            FROM parts_optimization
            GROUP BY abc_class
            ORDER BY FIELD(abc_class, 'A', 'B', 'C')
        ")->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $data]);
    }
}

class KPIController extends BaseController
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    public function getSummary()
    {
        $days = $this->request->getGet('days') ?? 30;
        
        // Calculate real-time KPIs
        $mtbf = $this->db->query("
            SELECT AVG(TIMESTAMPDIFF(HOUR, prev_failure, failure_date)) as mtbf
            FROM (
                SELECT asset_id, created_at as failure_date,
                    LAG(created_at) OVER (PARTITION BY asset_id ORDER BY created_at) as prev_failure
                FROM work_orders
                WHERE type = 'corrective' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ) t WHERE prev_failure IS NOT NULL
        ", [$days])->getRow()->mtbf ?? 0;
        
        $mttr = $this->db->query("
            SELECT AVG(actual_hours) as mttr
            FROM work_orders
            WHERE type = 'corrective' AND status = 'completed' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ", [$days])->getRow()->mttr ?? 0;
        
        $pmCompliance = $this->db->query("
            SELECT (COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*)) * 100 as compliance
            FROM work_orders
            WHERE type = 'preventive' AND due_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ", [$days])->getRow()->compliance ?? 0;
        
        $reactiveRatio = $this->db->query("
            SELECT 
                (COUNT(CASE WHEN type = 'corrective' THEN 1 END) / COUNT(*)) * 100 as reactive,
                (COUNT(CASE WHEN type = 'preventive' THEN 1 END) / COUNT(*)) * 100 as preventive
            FROM work_orders
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ", [$days])->getRow();
        
        return $this->respond([
            'status' => 'success',
            'data' => [
                'mtbf' => round($mtbf, 1),
                'mttr' => round($mttr, 1),
                'pm_compliance' => round($pmCompliance, 1),
                'reactive_ratio' => round($reactiveRatio->reactive ?? 0, 1),
                'preventive_ratio' => round($reactiveRatio->preventive ?? 0, 1)
            ]
        ]);
    }
    
    public function getTrends()
    {
        $days = $this->request->getGet('days') ?? 180;
        
        $data = $this->db->query("
            SELECT 
                DATE_FORMAT(snapshot_date, '%b') as month,
                AVG(mtbf) as mtbf,
                AVG(mttr) as mttr
            FROM kpi_snapshots
            WHERE snapshot_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY MONTH(snapshot_date), DATE_FORMAT(snapshot_date, '%b')
            ORDER BY snapshot_date
        ", [$days])->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $data]);
    }
    
    public function getCostBreakdown()
    {
        $days = $this->request->getGet('days') ?? 30;
        
        $data = $this->db->query("
            SELECT 
                'Labor' as category,
                SUM(actual_hours * 50) as amount
            FROM work_orders
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            UNION ALL
            SELECT 
                'Parts' as category,
                SUM(wop.quantity * p.unit_cost) as amount
            FROM work_order_parts wop
            JOIN work_orders wo ON wo.id = wop.work_order_id
            JOIN parts p ON p.id = wop.part_id
            WHERE wo.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ", [$days, $days])->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $data]);
    }
}
