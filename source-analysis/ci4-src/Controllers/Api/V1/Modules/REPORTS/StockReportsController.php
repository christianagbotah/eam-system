<?php

namespace App\Controllers\Api\V1\Modules\REPORTS;

use App\Controllers\Api\V1\BaseResourceController;

class StockReportsController extends BaseResourceController
{
    protected $format = 'json';

    public function movements()
    {
        $type = $this->request->getGet('type') ?? 'all';
        $days = $this->request->getGet('days') ?? 7;
        $db = \Config\Database::connect();
        
        $builder = $db->table('inventory_transactions it')
                      ->select('it.*, p.part_name, p.part_number, wo.title as work_order_title')
                      ->join('parts p', 'p.id = it.part_id', 'left')
                      ->join('work_orders wo', 'wo.id = it.work_order_id', 'left')
                      ->where('it.created_at >=', date('Y-m-d', strtotime("-{$days} days")));
        
        if ($type !== 'all') {
            $builder->where('it.transaction_type', $type);
        }
        
        $movements = $builder->orderBy('it.created_at', 'DESC')->get()->getResult();
        
        return $this->respond([
            'status' => 'success',
            'data' => $movements
        ]);
    }

    public function consumption()
    {
        $db = \Config\Database::connect();
        
        $query = "
            SELECT 
                p.part_name,
                p.part_number,
                SUM(CASE WHEN it.transaction_type = 'issue' THEN it.quantity ELSE 0 END) as total_issued,
                COUNT(DISTINCT it.work_order_id) as work_orders_count,
                AVG(CASE WHEN it.transaction_type = 'issue' THEN it.quantity ELSE 0 END) as avg_per_wo
            FROM parts p
            LEFT JOIN inventory_transactions it ON p.id = it.part_id
            WHERE p.is_spare_part = 1
            GROUP BY p.id
            ORDER BY total_issued DESC
        ";
        
        $consumption = $db->query($query)->getResult();
        
        return $this->respond([
            'status' => 'success',
            'data' => $consumption
        ]);
    }

    public function slowMoving()
    {
        $db = \Config\Database::connect();
        
        $query = "
            SELECT 
                i.id,
                i.item_name,
                i.item_code,
                i.quantity,
                i.unit_cost,
                (i.quantity * i.unit_cost) as total_value,
                COALESCE(MAX(it.created_at), i.created_at) as last_movement
            FROM inventory i
            LEFT JOIN part_inventory_links pil ON i.id = pil.inventory_id
            LEFT JOIN inventory_transactions it ON pil.part_id = it.part_id
            GROUP BY i.id
            HAVING last_movement < DATE_SUB(NOW(), INTERVAL 90 DAY)
            ORDER BY total_value DESC
        ";
        
        $slowMoving = $db->query($query)->getResult();
        
        return $this->respond([
            'status' => 'success',
            'data' => $slowMoving
        ]);
    }

    public function valuation()
    {
        $db = \Config\Database::connect();
        
        $query = "
            SELECT 
                SUM(quantity * unit_cost) as total_value,
                COUNT(*) as total_items,
                SUM(CASE WHEN quantity <= reorder_level THEN 1 ELSE 0 END) as low_stock_items,
                SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_items
            FROM inventory
        ";
        
        $valuation = $db->query($query)->getRow();
        
        return $this->respond([
            'status' => 'success',
            'data' => $valuation
        ]);
    }
}
