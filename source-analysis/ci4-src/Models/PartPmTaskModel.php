<?php

namespace App\Models;

use CodeIgniter\Model;

class PartPmTaskModel extends Model
{
    protected $table = 'part_pm_tasks';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'part_id',
        'pm_task_id',
        'frequency_value',
        'pm_trigger_id',
        'pm_type_id',
        'pm_mode_id',
        'estimated_duration',
        'pm_inspection_type_id',
        'meter_id',
        'last_meter_reading',
        'next_due_meter_reading',
        'is_active',
        'last_performed_date',
        'next_due_date'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function getPartTasks($partId)
    {
        return $this->select('part_pm_tasks.*, pm_tasks.task_name, pm_types.type_name, pm_trigger_types.trigger_name, pm_modes.mode_name, pm_inspection_types.inspection_name, parts.part_name, parts.part_code')
            ->join('pm_tasks', 'pm_tasks.task_id = part_pm_tasks.pm_task_id')
            ->join('pm_types', 'pm_types.type_id = part_pm_tasks.pm_type_id')
            ->join('pm_trigger_types', 'pm_trigger_types.trigger_id = part_pm_tasks.pm_trigger_id')
            ->join('pm_modes', 'pm_modes.mode_id = part_pm_tasks.pm_mode_id')
            ->join('pm_inspection_types', 'pm_inspection_types.inspection_id = part_pm_tasks.pm_inspection_type_id')
            ->join('parts', 'parts.id = part_pm_tasks.part_id')
            ->where('part_pm_tasks.part_id', $partId)
            ->where('part_pm_tasks.is_active', 1)
            ->findAll();
    }

    public function calculateNextDueDate($taskId)
    {
        $task = $this->find($taskId);
        if (!$task) return null;

        $lastDate = $task['last_performed_date'] ?? date('Y-m-d H:i:s');
        $frequency = $task['frequency_value'];
        $triggerId = $task['pm_trigger_id'];

        // Calculate based on trigger type
        switch ($triggerId) {
            case 1: // Time/days
                return date('Y-m-d H:i:s', strtotime("+{$frequency} days", strtotime($lastDate)));
            case 2: // Usage/Operations - calculated by meter readings
                if ($task['meter_id']) {
                    $db = \Config\Database::connect();
                    $reading = $db->query("
                        SELECT meter_value
                        FROM production_survey_meters
                        WHERE meter_id = ?
                        ORDER BY recorded_at DESC
                        LIMIT 1
                    ", [$task['meter_id']])->getRowArray();
                    
                    if ($reading) {
                        $nextDueReading = $reading['meter_value'] + $frequency;
                        $this->update($taskId, ['next_due_meter_reading' => $nextDueReading]);
                    }
                }
                return null; // Date set when meter threshold reached
            case 3: // Condition - triggered by monitoring
                return null;
            case 4: // Failure - no scheduled date
                return null;
            default:
                return date('Y-m-d H:i:s', strtotime("+{$frequency} days", strtotime($lastDate)));
        }
    }
}
