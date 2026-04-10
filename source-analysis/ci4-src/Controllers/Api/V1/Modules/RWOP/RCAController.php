<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\BaseController;
use App\Models\RCA5WhysModel;
use App\Models\RCAFishboneModel;
use CodeIgniter\HTTP\ResponseInterface;

class RCAController extends BaseController
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    // 5 Whys Analysis
    public function get5Whys()
    {
        $model = new RCA5WhysModel();
        $data = $model->select('rca_5whys.*, assets.name as asset_name')
                     ->join('assets', 'assets.id = rca_5whys.asset_id', 'left')
                     ->orderBy('created_at', 'DESC')
                     ->findAll();
        
        return $this->respond(['status' => 'success', 'data' => $data]);
    }
    
    public function get5WhysById($id)
    {
        $model = new RCA5WhysModel();
        $data = $model->find($id);
        
        if (!$data) {
            return $this->failNotFound('5 Whys analysis not found');
        }
        
        return $this->respond(['status' => 'success', 'data' => $data]);
    }
    
    public function create5Whys()
    {
        $model = new RCA5WhysModel();
        $data = $this->request->getJSON(true);
        
        if (!$model->validate($data)) {
            return $this->failValidationErrors($model->errors());
        }
        
        $data['created_by'] = $this->request->user_id ?? 1;
        
        if ($model->insert($data)) {
            return $this->respondCreated(['status' => 'success', 'message' => '5 Whys analysis created', 'id' => $model->getInsertID()]);
        }
        
        return $this->fail('Failed to create analysis');
    }
    
    public function update5Whys($id)
    {
        $model = new RCA5WhysModel();
        $data = $this->request->getJSON(true);
        
        if (!$model->find($id)) {
            return $this->failNotFound('Analysis not found');
        }
        
        if ($model->update($id, $data)) {
            return $this->respond(['status' => 'success', 'message' => 'Analysis updated']);
        }
        
        return $this->fail('Failed to update analysis');
    }
    
    public function delete5Whys($id)
    {
        $model = new RCA5WhysModel();
        
        if (!$model->find($id)) {
            return $this->failNotFound('Analysis not found');
        }
        
        if ($model->delete($id)) {
            return $this->respond(['status' => 'success', 'message' => 'Analysis deleted']);
        }
        
        return $this->fail('Failed to delete analysis');
    }
    
    // Fishbone Analysis
    public function getFishbone()
    {
        $model = new RCAFishboneModel();
        $data = $model->select('rca_fishbone.*, assets.name as asset_name')
                     ->join('assets', 'assets.id = rca_fishbone.asset_id', 'left')
                     ->orderBy('created_at', 'DESC')
                     ->findAll();
        
        return $this->respond(['status' => 'success', 'data' => $data]);
    }
    
    public function getFishboneById($id)
    {
        $model = new RCAFishboneModel();
        $data = $model->find($id);
        
        if (!$data) {
            return $this->failNotFound('Fishbone analysis not found');
        }
        
        return $this->respond(['status' => 'success', 'data' => $data]);
    }
    
    public function createFishbone()
    {
        $model = new RCAFishboneModel();
        $data = $this->request->getJSON(true);
        
        $data['created_by'] = $this->request->user_id ?? 1;
        
        if ($model->insert($data)) {
            return $this->respondCreated(['status' => 'success', 'message' => 'Fishbone analysis created', 'id' => $model->getInsertID()]);
        }
        
        return $this->fail('Failed to create analysis');
    }
    
    public function updateFishbone($id)
    {
        $model = new RCAFishboneModel();
        $data = $this->request->getJSON(true);
        
        if (!$model->find($id)) {
            return $this->failNotFound('Analysis not found');
        }
        
        if ($model->update($id, $data)) {
            return $this->respond(['status' => 'success', 'message' => 'Analysis updated']);
        }
        
        return $this->fail('Failed to update analysis');
    }
    
    public function deleteFishbone($id)
    {
        $model = new RCAFishboneModel();
        
        if (!$model->find($id)) {
            return $this->failNotFound('Analysis not found');
        }
        
        if ($model->delete($id)) {
            return $this->respond(['status' => 'success', 'message' => 'Analysis deleted']);
        }
        
        return $this->fail('Failed to delete analysis');
    }
    
    // Statistics
    public function getStatistics()
    {
        $days = $this->request->getGet('days') ?? 30;
        
        // MTBF by Asset
        $mtbfData = $this->db->query("
            SELECT 
                a.name as asset,
                COALESCE(AVG(TIMESTAMPDIFF(HOUR, prev_failure, failure_date)), 0) as mtbf,
                COALESCE(AVG(wo.actual_hours), 0) as mttr,
                COUNT(f.id) as failures
            FROM assets a
            LEFT JOIN (
                SELECT asset_id, created_at as failure_date,
                    LAG(created_at) OVER (PARTITION BY asset_id ORDER BY created_at) as prev_failure
                FROM work_orders
                WHERE type = 'corrective' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ) f ON a.id = f.asset_id
            LEFT JOIN work_orders wo ON wo.asset_id = a.id AND wo.type = 'corrective'
            GROUP BY a.id, a.name
            HAVING failures > 0
            ORDER BY mtbf DESC
            LIMIT 10
        ", [$days])->getResultArray();
        
        // Failure Trends
        $trendData = $this->db->query("
            SELECT 
                DATE_FORMAT(created_at, '%b') as month,
                COUNT(*) as failures,
                SUM(estimated_cost) as cost
            FROM work_orders
            WHERE type = 'corrective' AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY MONTH(created_at), DATE_FORMAT(created_at, '%b')
            ORDER BY MONTH(created_at)
        ")->getResultArray();
        
        // Category Distribution
        $categoryData = $this->db->query("
            SELECT 
                category,
                COUNT(*) as value
            FROM failure_modes
            GROUP BY category
        ")->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => [
                'mtbf' => $mtbfData,
                'trends' => $trendData,
                'categories' => $categoryData
            ]
        ]);
    }
}
