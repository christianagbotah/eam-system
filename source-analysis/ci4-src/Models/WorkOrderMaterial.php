<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderMaterial extends Model
{
    protected $table = 'work_order_materials';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'work_order_id', 'inventory_item_id', 'quantity_required',
        'quantity_reserved', 'quantity_issued', 'unit_cost', 'status'
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'inventory_item_id' => 'required|integer',
        'quantity_required' => 'required|decimal',
        'status' => 'in_list[required,reserved,issued,returned]'
    ];

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class, 'work_order_id');
    }

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}