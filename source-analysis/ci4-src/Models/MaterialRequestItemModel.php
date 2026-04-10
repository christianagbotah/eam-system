<?php

namespace App\Models;

use CodeIgniter\Model;

class MaterialRequestItemModel extends Model
{
    protected $table = 'material_request_items';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'material_request_id', 'inventory_item_id', 'item_code', 'item_name',
        'quantity_requested', 'quantity_approved', 'quantity_issued', 'unit',
        'unit_cost', 'total_cost', 'notes', 'created_at'
    ];
    protected $useTimestamps = false;
}
