<?php

namespace App\Models;

use CodeIgniter\Model;

class MaintenanceOrderChecklistModel extends Model
{
    protected $table = 'maintenance_order_checklist';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'maintenance_order_id', 'item_description', 'item_order', 'category',
        'is_mandatory', 'is_completed', 'completed_by', 'completed_at',
        'result', 'measurement_value', 'expected_value', 'notes', 'photo_url'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';

    public function getChecklistByOrder($orderId)
    {
        return $this->where('maintenance_order_id', $orderId)
            ->orderBy('item_order', 'ASC')
            ->findAll();
    }

    public function completeItem($id, $userId, $result, $notes = null)
    {
        return $this->update($id, [
            'is_completed' => 1,
            'completed_by' => $userId,
            'completed_at' => date('Y-m-d H:i:s'),
            'result' => $result,
            'notes' => $notes
        ]);
    }

    public function getCompletionPercentage($orderId)
    {
        $total = $this->where('maintenance_order_id', $orderId)->countAllResults();
        $completed = $this->where('maintenance_order_id', $orderId)
            ->where('is_completed', 1)
            ->countAllResults();

        return $total > 0 ? round(($completed / $total) * 100, 2) : 0;
    }

    public function bulkCreateFromTemplate($orderId, $templateItems)
    {
        $data = [];
        foreach ($templateItems as $index => $item) {
            $data[] = [
                'maintenance_order_id' => $orderId,
                'item_description' => $item['description'],
                'item_order' => $index + 1,
                'category' => $item['category'] ?? null,
                'is_mandatory' => $item['is_mandatory'] ?? 0,
                'expected_value' => $item['expected_value'] ?? null
            ];
        }

        return $this->insertBatch($data);
    }
}
