<?php

namespace App\Controllers;

use App\Models\PmPartTaskModel;
use App\Models\PmScheduleNewModel;

class PMSetup extends BaseController
{
    public function initializeSchedules()
    {
        $taskModel = new PmPartTaskModel();
        $scheduleModel = new PmScheduleNewModel();
        
        $tasks = $taskModel->where('is_active', 1)->findAll();
        $created = 0;
        
        foreach ($tasks as $task) {
            $existing = $scheduleModel->where('part_task_id', $task['id'])->first();
            
            if (!$existing) {
                $partsModel = new \App\Models\PartsModel();
                $part = $partsModel->find($task['part_id']);
                
                $scheduleModel->insert([
                    'part_task_id' => $task['id'],
                    'equipment_id' => $part['equipment_id'],
                    'part_id' => $task['part_id'],
                    'start_date' => date('Y-m-d', strtotime('-30 days')),
                    'next_due_date' => date('Y-m-d'),
                    'status' => 'scheduled'
                ]);
                $created++;
            }
        }
        
        echo "$created schedules created with due dates set to today. <a href='/pmo'>Go to PMO Dashboard</a>";
    }
    
    public function createTestSchedules()
    {
        $taskModel = new PmPartTaskModel();
        $scheduleModel = new PmScheduleNewModel();
        $partsModel = new \App\Models\PartsModel();
        
        $tasks = $taskModel->where('is_active', 1)->findAll();
        
        if (empty($tasks)) {
            echo "No PM tasks found. Please assign PM tasks to parts first. <a href='/parts/partLists'>Go to Parts</a>";
            return;
        }
        
        $created = 0;
        foreach ($tasks as $task) {
            $scheduleModel->where('part_task_id', $task['id'])->delete();
            
            $part = $partsModel->find($task['part_id']);
            
            $scheduleModel->insert([
                'part_task_id' => $task['id'],
                'equipment_id' => $part['equipment_id'],
                'part_id' => $task['part_id'],
                'start_date' => date('Y-m-d', strtotime('-30 days')),
                'next_due_date' => date('Y-m-d'),
                'status' => 'scheduled'
            ]);
            $created++;
        }
        
        echo "$created test schedules created (all due today). <a href='/pmo/generateWorkOrders'>Generate Work Orders</a> | <a href='/pmo'>Go to PMO Dashboard</a>";
    }
}
