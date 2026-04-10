<?php

namespace App\Models;

use CodeIgniter\Model;

class EamWorkOrderModel extends Model
{
    protected $table = 'work_orders';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['wo_number', 'asset_id', 'wo_type', 'priority', 'status', 'title', 'description', 'requested_by', 'assigned_to', 'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end', 'estimated_hours', 'actual_hours', 'estimated_cost', 'actual_cost', 'completion_notes'];
    protected $useTimestamps = true;
    protected $validationRules = [
        'wo_number' => 'required|is_unique[work_orders.wo_number,id,{id}]',
        'asset_id' => 'required|integer',
        'title' => 'required|min_length[5]',
    ];

    public function getWithAsset(int $id): ?array
    {
        return $this->select('work_orders.*, assets.asset_name, assets.asset_code')
            ->join('assets', 'assets.id = work_orders.asset_id')
            ->find($id);
    }

    public function getDueWorkOrders(): array
    {
        return $this->where('status', 'pending')
            ->where('scheduled_start <=', date('Y-m-d'))
            ->findAll();
    }
}
