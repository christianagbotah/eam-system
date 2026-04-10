<?php

namespace App\Models;

use CodeIgniter\Model;

class StockTransactionModel extends Model
{
    protected $table = 'stock_transactions';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'transaction_number', 'inventory_item_id', 'transaction_type',
        'quantity', 'unit_cost', 'total_cost', 'reference_type',
        'reference_id', 'from_location', 'to_location', 'performed_by',
        'notes', 'transaction_date'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = null;
}
