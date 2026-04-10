<?php

namespace App\Models;

use CodeIgniter\Model;

class AssetPmTaskModel extends Model
{
    protected $table = 'asset_pm_tasks';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'asset_node_id',
        'task_name',
        'task_description',
        'frequency_value',
        'frequency_unit',
        'last_completed',
        'next_due',
        'assigned_group',
        'status'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function calculateNextDue($taskId)
    {
        $task = $this->find($taskId);
        if (!$task) return null;

        $lastCompleted = $task['last_completed'] ? strtotime($task['last_completed']) : time();
        
        switch ($task['frequency_unit']) {
            case 'days':
                $nextDue = date('Y-m-d H:i:s', strtotime("+{$task['frequency_value']} days", $lastCompleted));
                break;
            case 'hours':
            case 'cycles':
            case 'quantity':
                // Usage-based, calculate from usage data
                $nextDue = $this->calculateUsageBasedDue($task);
                break;
            default:
                $nextDue = null;
        }

        $this->update($taskId, ['next_due' => $nextDue]);
        return $nextDue;
    }

    private function calculateUsageBasedDue($task)
    {
        $usageModel = new AssetUsageModel();
        $totalUsage = $usageModel->getTotalUsage($task['asset_node_id']);
        $currentUsage = $totalUsage[$task['frequency_unit']] ?? 0;
        
        // Estimate based on average usage rate
        $avgRate = $usageModel->getAverageUsageRate($task['asset_node_id'], $task['frequency_unit']);
        if ($avgRate > 0) {
            $remainingUsage = $task['frequency_value'] - ($currentUsage % $task['frequency_value']);
            $daysUntilDue = ceil($remainingUsage / $avgRate);
            return date('Y-m-d H:i:s', strtotime("+{$daysUntilDue} days"));
        }
        
        return null;
    }
}
