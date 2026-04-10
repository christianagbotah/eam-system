<?php

namespace App\Repositories;

class EamInventoryRepository extends BaseRepository
{
    protected $table = 'inventory_items';

    public function stockIn($itemId, $quantity, $reference = null)
    {
        $this->db->transStart();
        
        $this->db->table($this->table)->where('id', $itemId)->set('quantity_on_hand', 'quantity_on_hand + ' . $quantity, false)->update();
        
        $this->db->table('stock_transactions')->insert([
            'inventory_item_id' => $itemId,
            'transaction_type' => 'receipt',
            'quantity' => $quantity,
            'notes' => $reference,
            'transaction_date' => date('Y-m-d H:i:s'),
            'performed_by' => 1
        ]);
        
        $this->db->transComplete();
        return $this->db->transStatus();
    }

    public function stockOut($itemId, $quantity, $reference = null)
    {
        $this->db->transStart();
        
        $this->db->table($this->table)->where('id', $itemId)->set('quantity_on_hand', 'quantity_on_hand - ' . $quantity, false)->update();
        
        $this->db->table('stock_transactions')->insert([
            'inventory_item_id' => $itemId,
            'transaction_type' => 'issue',
            'quantity' => $quantity,
            'notes' => $reference,
            'transaction_date' => date('Y-m-d H:i:s'),
            'performed_by' => 1
        ]);
        
        $this->db->transComplete();
        return $this->db->transStatus();
    }

    public function reserve($itemId, $workOrderId, $quantity)
    {
        $this->db->transStart();
        
        $this->db->table($this->table)->where('id', $itemId)->set('quantity_reserved', 'quantity_reserved + ' . $quantity, false)->update();
        
        $this->db->table('work_order_materials')->insert([
            'work_order_id' => $workOrderId,
            'inventory_item_id' => $itemId,
            'quantity_required' => $quantity,
            'quantity_used' => 0
        ]);
        
        $this->db->transComplete();
        return $this->db->transStatus();
    }
}
