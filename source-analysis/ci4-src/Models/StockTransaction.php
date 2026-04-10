<?php

namespace App\Models;

use CodeIgniter\Model;

class StockTransaction extends Model
{
    protected $table = 'stock_transactions';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'inventory_item_id', 'transaction_type', 'quantity', 'notes'
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = false;

    protected $validationRules = [
        'inventory_item_id' => 'required|integer',
        'transaction_type' => 'required|max_length[20]',
        'quantity' => 'required|decimal'
    ];

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}