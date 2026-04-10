<?php

namespace App\Models;

use CodeIgniter\Model;

class MaintenanceOrderPartsModel extends Model
{
    protected $table = 'maintenance_order_parts';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'maintenance_order_id', 'part_id', 'part_name', 'part_number',
        'quantity_required', 'quantity_used', 'unit_cost', 'total_cost',
        'warehouse_location', 'issued_by', 'issued_date', 'return_quantity',
        'status', 'notes'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';

    protected $beforeInsert = ['calculateTotalCost'];
    protected $beforeUpdate = ['calculateTotalCost'];

    protected function calculateTotalCost(array $data)
    {
        if (isset($data['data']['quantity_used']) && isset($data['data']['unit_cost'])) {
            $data['data']['total_cost'] = $data['data']['quantity_used'] * $data['data']['unit_cost'];
        }

        return $data;
    }

    public function getPartsByOrder($orderId)
    {
        return $this->where('maintenance_order_id', $orderId)->findAll();
    }

    public function getTotalPartsCost($orderId)
    {
        $result = $this->selectSum('total_cost')
            ->where('maintenance_order_id', $orderId)
            ->first();
        
        return $result['total_cost'] ?? 0;
    }

    public function issuePart($id, $userId)
    {
        return $this->update($id, [
            'status' => 'issued',
            'issued_by' => $userId,
            'issued_date' => date('Y-m-d H:i:s')
        ]);
    }
}
