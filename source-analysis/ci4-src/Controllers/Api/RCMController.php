<?php

namespace App\Controllers\API;

use CodeIgniter\RESTful\ResourceController;

class RCMController extends ResourceController
{
    protected $format = 'json';

    public function criticalityAssessment()
    {
        $db = \Config\Database::connect();
        $query = $db->query("
            SELECT ac.*, a.name as asset_name, a.asset_type
            FROM asset_criticality ac
            JOIN assets a ON ac.asset_id = a.id
            ORDER BY ac.total_score DESC
        ");
        
        return $this->respond(['data' => $query->getResultArray()]);
    }

    public function assessCriticality()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $total = $data['safety'] + $data['production'] + $data['quality'] + $data['environmental'] + $data['cost'];
        $level = $total >= 35 ? 'critical' : ($total >= 25 ? 'high' : ($total >= 15 ? 'medium' : 'low'));
        
        $existing = $db->query("SELECT id FROM asset_criticality WHERE asset_id = ?", [$data['asset_id']])->getRow();
        
        if ($existing) {
            $db->query("UPDATE asset_criticality SET safety_impact=?, production_impact=?, quality_impact=?, environmental_impact=?, cost_impact=?, total_score=?, criticality_level=?, assessed_at=NOW() WHERE asset_id=?",
                [$data['safety'], $data['production'], $data['quality'], $data['environmental'], $data['cost'], $total, $level, $data['asset_id']]);
        } else {
            $db->query("INSERT INTO asset_criticality (asset_id, safety_impact, production_impact, quality_impact, environmental_impact, cost_impact, total_score, criticality_level, assessed_at) VALUES (?,?,?,?,?,?,?,?,NOW())",
                [$data['asset_id'], $data['safety'], $data['production'], $data['quality'], $data['environmental'], $data['cost'], $total, $level]);
        }
        
        return $this->respond(['message' => 'Assessment saved', 'level' => $level, 'score' => $total]);
    }

    public function rcmAnalysis()
    {
        $db = \Config\Database::connect();
        $query = $db->query("
            SELECT ra.*, a.name as asset_name
            FROM rcm_analysis ra
            JOIN assets a ON ra.asset_id = a.id
            ORDER BY ra.created_at DESC
        ");
        
        return $this->respond(['data' => $query->getResultArray()]);
    }

    public function createAnalysis()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $db->query("INSERT INTO rcm_analysis (asset_id, function_description, functional_failure, failure_mode, failure_effect, failure_consequence, recommended_strategy, status, created_at) VALUES (?,?,?,?,?,?,?,?,NOW())",
            [$data['asset_id'], $data['function'], $data['functional_failure'], $data['failure_mode'], $data['failure_effect'], $data['consequence'], $data['strategy'], 'draft']);
        
        return $this->respond(['message' => 'RCM analysis created', 'id' => $db->insertID()]);
    }

    public function strategies()
    {
        $db = \Config\Database::connect();
        $query = $db->query("
            SELECT ms.*, a.name as asset_name
            FROM maintenance_strategies ms
            JOIN assets a ON ms.asset_id = a.id
            ORDER BY ms.priority ASC
        ");
        
        return $this->respond(['data' => $query->getResultArray()]);
    }

    public function recommendStrategy($assetId)
    {
        $db = \Config\Database::connect();
        $criticality = $db->query("SELECT * FROM asset_criticality WHERE asset_id = ?", [$assetId])->getRowArray();
        
        if (!$criticality) {
            return $this->fail('Asset criticality not assessed');
        }
        
        $strategy = match($criticality['criticality_level']) {
            'critical' => 'predictive',
            'high' => 'preventive',
            'medium' => 'preventive',
            default => 'corrective'
        };
        
        return $this->respond(['recommended_strategy' => $strategy, 'criticality' => $criticality['criticality_level']]);
    }

    public function statistics()
    {
        $db = \Config\Database::connect();
        
        $stats = [
            'total_assets' => $db->query("SELECT COUNT(*) as cnt FROM asset_criticality")->getRow()->cnt,
            'critical' => $db->query("SELECT COUNT(*) as cnt FROM asset_criticality WHERE criticality_level='critical'")->getRow()->cnt,
            'high' => $db->query("SELECT COUNT(*) as cnt FROM asset_criticality WHERE criticality_level='high'")->getRow()->cnt,
            'rcm_analyses' => $db->query("SELECT COUNT(*) as cnt FROM rcm_analysis")->getRow()->cnt,
            'strategies' => $db->query("SELECT COUNT(*) as cnt FROM maintenance_strategies")->getRow()->cnt
        ];
        
        return $this->respond($stats);
    }
}
