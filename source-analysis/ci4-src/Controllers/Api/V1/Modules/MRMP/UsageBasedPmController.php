<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\Api\V1\BaseResourceController;

class UsageBasedPmController extends BaseResourceController
{
    protected $format = 'json';

    public function checkUsageBasedTasks()
    {
        $db = \Config\Database::connect();
        
        // Get all usage-based PM tasks (trigger_id = 2)
        $usageTasks = $db->table('part_pm_tasks')
            ->where('pm_trigger_id', 2)
            ->where('is_active', 1)
            ->where('meter_id IS NOT NULL')
            ->get()
            ->getResultArray();
        
        $dueTasks = [];
        
        foreach ($usageTasks as $task) {
            // Get latest meter reading from production survey
            $latestReading = $db->query("
                SELECT meter_value, recorded_at
                FROM production_survey_meters
                WHERE meter_id = ?
                ORDER BY recorded_at DESC
                LIMIT 1
            ", [$task['meter_id']])->getRowArray();
            
            if ($latestReading) {
                $currentReading = $latestReading['meter_value'];
                $nextDueReading = $task['next_due_meter_reading'];
                
                // Check if current reading exceeds next due reading
                if ($currentReading >= $nextDueReading) {
                    $dueTasks[] = [
                        'task_id' => $task['id'],
                        'part_id' => $task['part_id'],
                        'current_reading' => $currentReading,
                        'due_reading' => $nextDueReading,
                        'overdue_by' => $currentReading - $nextDueReading
                    ];
                    
                    // Update next due date to trigger work order generation
                    $db->table('part_pm_tasks')
                        ->where('id', $task['id'])
                        ->update([
                            'next_due_date' => date('Y-m-d'),
                            'last_meter_reading' => $currentReading
                        ]);
                }
            }
        }
        
        return $this->respond([
            'status' => 'success',
            'message' => count($dueTasks) . ' usage-based tasks are due',
            'data' => $dueTasks
        ]);
    }

    public function updateMeterReading()
    {
        $data = $this->request->getJSON(true);
        $meterId = $data['meter_id'];
        $meterValue = $data['meter_value'];
        
        $db = \Config\Database::connect();
        
        // Record meter reading
        $db->table('production_survey_meters')->insert([
            'meter_id' => $meterId,
            'meter_value' => $meterValue,
            'recorded_at' => date('Y-m-d H:i:s'),
            'recorded_by' => $data['user_id'] ?? null
        ]);
        
        // Check if any PM tasks are due based on this reading
        $this->checkUsageBasedTasks();
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Meter reading recorded and PM tasks checked'
        ]);
    }

    public function calculateNextDueReading($taskId)
    {
        $db = \Config\Database::connect();
        $task = $db->table('part_pm_tasks')->where('id', $taskId)->get()->getRowArray();
        
        if (!$task || !$task['meter_id']) {
            return null;
        }
        
        // Get current meter reading
        $currentReading = $db->query("
            SELECT meter_value
            FROM production_survey_meters
            WHERE meter_id = ?
            ORDER BY recorded_at DESC
            LIMIT 1
        ", [$task['meter_id']])->getRowArray();
        
        if ($currentReading) {
            $nextDue = $currentReading['meter_value'] + $task['frequency_value'];
            
            // Update task
            $db->table('part_pm_tasks')
                ->where('id', $taskId)
                ->update([
                    'last_meter_reading' => $currentReading['meter_value'],
                    'next_due_meter_reading' => $nextDue
                ]);
            
            return $nextDue;
        }
        
        return null;
    }
}
