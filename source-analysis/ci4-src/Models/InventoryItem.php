<?php

namespace App\Models;

class InventoryItem extends PlantScopedModel
{
    protected $table = 'inventory_items';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'plant_id',
        'part_code', 'part_name', 'description', 'unit_of_measure',
        'unit_cost', 'quantity_on_hand', 'quantity_reserved', 
        'reorder_point', 'location', 'status'
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'part_code' => 'required|is_unique[inventory_items.part_code]|max_length[50]',
        'part_name' => 'required|max_length[255]',
        'status' => 'in_list[active,inactive,discontinued]'
    ];

    public function workOrderMaterials()
    {
        return $this->hasMany(WorkOrderMaterial::class, 'inventory_item_id');
    }

    public function stockTransactions()
    {
        return $this->hasMany(StockTransaction::class, 'inventory_item_id');
    }
}