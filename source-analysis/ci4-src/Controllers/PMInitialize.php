<?php

namespace App\Controllers;

use App\Models\PmPartTaskModel;
use App\Models\PmScheduleNewModel;
use App\Models\PartsModel;
use App\Models\EquipmentModel;

class PMInitialize extends BaseController
{
    public function index()
    {
        $equipmentModel = new EquipmentModel();
        $taskModel = new PmPartTaskModel();
        
        $equipment = $equipmentModel->select('equipment.*, COUNT(DISTINCT pm_part_tasks.id) as task_count')
            ->join('parts', 'parts.equipment_id = equipment.id', 'left')
            ->join('pm_part_tasks', 'pm_part_tasks.part_id = parts.id AND pm_part_tasks.is_active = 1', 'left')
            ->groupBy('equipment.id')
            ->having('task_count >', 0)
            ->findAll();
        
        return view('maintenance/pm_initialize_index', ['equipment' => $equipment]);
    }
    
    public function equipment($equipmentId)
    {
        $equipmentModel = new EquipmentModel();
        $taskModel = new PmPartTaskModel();
        $scheduleModel = new PmScheduleNewModel();
        
        $equipment = $equipmentModel->find($equipmentId);
        
        $tasks = $taskModel->select('pm_part_tasks.*, parts.name as part_name, parts.part_number, pm_schedules.id as schedule_id, pm_schedules.last_completed_date, pm_schedules.next_due_date, pm_trigger.trigger_name')
            ->join('parts', 'parts.id = pm_part_tasks.part_id')
            ->join('pm_trigger', 'pm_trigger.trigger_id = pm_part_tasks.pm_trigger_id')
            ->join('pm_schedules', 'pm_schedules.part_task_id = pm_part_tasks.id', 'left')
            ->where('parts.equipment_id', $equipmentId)
            ->where('pm_part_tasks.is_active', 1)
            ->findAll();
        
        return view('maintenance/pm_initialize_equipment', ['equipment' => $equipment, 'tasks' => $tasks]);
    }
    
    public function save()
    {
        $scheduleModel = new PmScheduleNewModel();
        $partsModel = new PartsModel();
        
        $taskId = $this->request->getPost('task_id');
        $baselineDate = $this->request->getPost('baseline_date');
        
        $taskModel = new PmPartTaskModel();
        $task = $taskModel->select('pm_part_tasks.*, pm_trigger.trigger_name')
            ->join('pm_trigger', 'pm_trigger.trigger_id = pm_part_tasks.pm_trigger_id')
            ->find($taskId);
        $part = $partsModel->find($task['part_id']);
        
        $scheduleModel->where('part_task_id', $taskId)->delete();
        
        $scheduleData = [
            'part_task_id' => $taskId,
            'equipment_id' => $part['equipment_id'],
            'part_id' => $task['part_id'],
            'start_date' => $baselineDate,
            'last_completed_date' => $baselineDate,
            'status' => 'scheduled'
        ];
        
        if ($task['frequency_type'] === 'usage') {
            $scheduleData['accumulated_usage'] = 0;
            $scheduleData['next_due_date'] = null;
        } else {
            $scheduleData['next_due_date'] = date('Y-m-d', strtotime($baselineDate . ' + ' . $task['frequency_value'] . ' ' . $task['trigger_name']));
        }
        
        $scheduleModel->insert($scheduleData);
        
        return redirect()->back()->with('success', 'PM tracking initialized');
    }
    
    public function bulkSave()
    {
        $scheduleModel = new PmScheduleNewModel();
        $partsModel = new PartsModel();
        $taskModel = new PmPartTaskModel();
        
        $equipmentId = $this->request->getPost('equipment_id');
        $baselineDate = $this->request->getPost('baseline_date');
        $taskIds = $this->request->getPost('task_ids');
        
        if (empty($taskIds)) {
            return redirect()->back()->with('error', 'No tasks selected');
        }
        
        $count = 0;
        foreach ($taskIds as $taskId) {
            $task = $taskModel->select('pm_part_tasks.*, pm_trigger.trigger_name')
                ->join('pm_trigger', 'pm_trigger.trigger_id = pm_part_tasks.pm_trigger_id')
                ->find($taskId);
            $part = $partsModel->find($task['part_id']);
            
            $scheduleModel->where('part_task_id', $taskId)->delete();
            
            $scheduleData = [
                'part_task_id' => $taskId,
                'equipment_id' => $part['equipment_id'],
                'part_id' => $task['part_id'],
                'start_date' => $baselineDate,
                'last_completed_date' => $baselineDate,
                'status' => 'scheduled'
            ];
            
            if ($task['frequency_type'] === 'usage') {
                $scheduleData['accumulated_usage'] = 0;
                $scheduleData['next_due_date'] = null;
            } else {
                $scheduleData['next_due_date'] = date('Y-m-d', strtotime($baselineDate . ' + ' . $task['frequency_value'] . ' ' . $task['trigger_name']));
            }
            
            $scheduleModel->insert($scheduleData);
            $count++;
        }
        
        return redirect()->back()->with('success', "$count PM schedules initialized");
    }
}
