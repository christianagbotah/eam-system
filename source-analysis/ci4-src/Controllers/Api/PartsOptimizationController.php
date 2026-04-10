<?php

namespace App\Controllers\API;

use CodeIgniter\RESTful\ResourceController;

class PartsOptimizationController extends ResourceController
{
    protected $format = 'json';

    public function abcAnalysis()
    {
        $db = \Config\Database::connect();
        $query = $db->query("
            SELECT po.*, p.part_number, p.description, p.unit_cost
            FROM parts_optimization po
            JOIN parts p ON po.part_id = p.id
            ORDER BY po.annual_cost DESC
        ");
        
        return $this->respond(['data' => $query->getResultArray()]);
    }

    public function calculateEOQ($partId)
    {
        $db = \Config\Database::connect();
        $part = $db->query("SELECT * FROM parts_optimization WHERE part_id = ?", [$partId])->getRowArray();
        
        if (!$part) return $this->failNotFound();
        
        // EOQ = sqrt((2 * D * S) / H)
        // D = annual demand, S = ordering cost, H = holding cost
        $D = $part['annual_usage'];
        $S = 50; // ordering cost
        $H = $part['annual_cost'] / $D * 0.25; // 25% holding cost
        
        $eoq = sqrt((2 * $D * $S) / $H);
        
        $db->query("UPDATE parts_optimization SET eoq = ?, last_calculated = NOW() WHERE part_id = ?", [$eoq, $partId]);
        
        return $this->respond(['eoq' => round($eoq, 2), 'part_id' => $partId]);
    }

    public function reorderPoint($partId)
    {
        $db = \Config\Database::connect();
        $part = $db->query("SELECT * FROM parts_optimization WHERE part_id = ?", [$partId])->getRowArray();
        
        if (!$part) return $this->failNotFound();
        
        // ROP = (Average daily usage × Lead time) + Safety stock
        $avgDailyUsage = $part['annual_usage'] / 365;
        $rop = ($avgDailyUsage * $part['lead_time_days']) + $part['safety_stock'];
        
        $db->query("UPDATE parts_optimization SET reorder_point = ? WHERE part_id = ?", [$rop, $partId]);
        
        return $this->respond(['reorder_point' => round($rop, 2), 'part_id' => $partId]);
    }

    public function obsoleteParts()
    {
        $db = \Config\Database::connect();
        $query = $db->query("
            SELECT op.*, p.part_number, p.description, i.quantity_on_hand
            FROM obsolete_parts op
            JOIN parts p ON op.part_id = p.id
            LEFT JOIN inventory_items i ON p.id = i.part_id
            ORDER BY op.value DESC
        ");
        
        return $this->respond(['data' => $query->getResultArray()]);
    }

    public function usageTrends($partId)
    {
        $db = \Config\Database::connect();
        $query = $db->query("
            SELECT DATE_FORMAT(transaction_date, '%Y-%m') as month, 
                   SUM(quantity) as total_usage,
                   SUM(cost) as total_cost
            FROM parts_usage_history
            WHERE part_id = ? AND transaction_type = 'issue'
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        ", [$partId]);
        
        return $this->respond(['data' => $query->getResultArray()]);
    }

    public function statistics()
    {
        $db = \Config\Database::connect();
        
        $stats = [
            'total_parts' => $db->query("SELECT COUNT(*) as cnt FROM parts_optimization")->getRow()->cnt,
            'a_class' => $db->query("SELECT COUNT(*) as cnt FROM parts_optimization WHERE abc_classification = 'A'")->getRow()->cnt,
            'b_class' => $db->query("SELECT COUNT(*) as cnt FROM parts_optimization WHERE abc_classification = 'B'")->getRow()->cnt,
            'c_class' => $db->query("SELECT COUNT(*) as cnt FROM parts_optimization WHERE abc_classification = 'C'")->getRow()->cnt,
            'obsolete_count' => $db->query("SELECT COUNT(*) as cnt FROM obsolete_parts")->getRow()->cnt,
            'obsolete_value' => $db->query("SELECT SUM(value) as val FROM obsolete_parts")->getRow()->val ?? 0
        ];
        
        return $this->respond($stats);
    }

    public function runOptimization()
    {
        $db = \Config\Database::connect();
        
        // Calculate ABC classification
        $parts = $db->query("SELECT part_id, annual_cost FROM parts_optimization ORDER BY annual_cost DESC")->getResultArray();
        $total = array_sum(array_column($parts, 'annual_cost'));
        $cumulative = 0;
        
        foreach ($parts as $part) {
            $cumulative += $part['annual_cost'];
            $percentage = ($cumulative / $total) * 100;
            
            $class = $percentage <= 80 ? 'A' : ($percentage <= 95 ? 'B' : 'C');
            $db->query("UPDATE parts_optimization SET abc_classification = ? WHERE part_id = ?", [$class, $part['part_id']]);
        }
        
        return $this->respond(['message' => 'Optimization completed', 'parts_processed' => count($parts)]);
    }
}
