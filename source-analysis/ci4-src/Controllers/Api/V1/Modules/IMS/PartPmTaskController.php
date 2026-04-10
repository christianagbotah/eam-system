<?php

namespace App\Controllers\Api\V1\Modules\IMS;

use App\Controllers\Api\V1\BaseResourceController;
use CodeIgniter\API\ResponseTrait;

class PartPmTaskController extends BaseResourceController
{
    use ResponseTrait;

    protected $modelName = 'App\Models\PartPmTaskModel';
    protected $format = 'json';

    public function createBatch()
    {
        if ($this->request->getMethod() === 'get') {
            return $this->respond([
                'status' => 'error',
                'message' => 'This endpoint only accepts POST requests'
            ], 405);
        }

        $data = $this->request->getJSON(true);
        $partId = $data['part_id'] ?? null;
        $tasks = $data['tasks'] ?? [];

        if (!$partId || empty($tasks)) {
            return $this->fail('Part ID and tasks are required', 400);
        }

        $model = new \App\Models\PartPmTaskModel();
        $db = \Config\Database::connect();
        $db->transStart();

        try {
            foreach ($tasks as $task) {
                $taskData = [
                    'part_id' => $partId,
                    'pm_task_id' => $task['pm_task_id'],
                    'frequency_value' => $task['frequency_value'],
                    'pm_trigger_id' => $task['pm_trigger_id'],
                    'pm_type_id' => $task['pm_type_id'],
                    'pm_mode_id' => $task['pm_mode_id'],
                    'estimated_duration' => $task['estimated_duration'],
                    'pm_inspection_type_id' => $task['pm_inspection_type_id'],
                    'is_active' => 1
                ];

                $taskId = $model->insert($taskData);

                // Calculate and set next due date
                $nextDueDate = $model->calculateNextDueDate($taskId);
                if ($nextDueDate) {
                    $model->update($taskId, ['next_due_date' => $nextDueDate]);
                    
                    // Create initial schedule
                    $this->createSchedule($taskId, $partId, $nextDueDate);
                }
            }

            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->fail('Failed to create PM tasks', 500);
            }

            return $this->respondCreated([
                'status' => 'success',
                'message' => count($tasks) . ' PM tasks created successfully'
            ]);
        } catch (\Exception $e) {
            $db->transRollback();
            return $this->fail('Error: ' . $e->getMessage(), 500);
        }
    }

    public function show($id = null)
    {
        $model = new \App\Models\PartPmTaskModel();
        $task = $model->find($id);

        if (!$task) {
            return $this->failNotFound('Task not found');
        }

        return $this->respond([
            'status' => 'success',
            'data' => $task
        ]);
    }

    public function update($id = null)
    {
        $model = new \App\Models\PartPmTaskModel();
        $data = $this->request->getJSON(true);

        if ($model->update($id, $data)) {
            $nextDueDate = $model->calculateNextDueDate($id);
            if ($nextDueDate) {
                $model->update($id, ['next_due_date' => $nextDueDate]);
            }
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Task updated successfully'
            ]);
        }

        return $this->fail('Failed to update task', 400);
    }

    public function delete($id = null)
    {
        $model = new \App\Models\PartPmTaskModel();

        if ($model->delete($id)) {
            return $this->respond([
                'status' => 'success',
                'message' => 'Task deleted successfully'
            ]);
        }

        return $this->fail('Failed to delete task', 400);
    }

    public function getAllTasks()
    {
        $model = new \App\Models\PartPmTaskModel();
        $db = \Config\Database::connect();
        
        $tasks = $db->table('part_pm_tasks ppt')
            ->select('ppt.*, pt.task_name, p.part_name, p.part_code, ptt.trigger_id, ptt.trigger_name, ptype.type_name, pm.mode_name')
            ->join('pm_tasks pt', 'pt.task_id = ppt.pm_task_id', 'left')
            ->join('parts p', 'p.id = ppt.part_id', 'left')
            ->join('pm_trigger_types ptt', 'ptt.trigger_id = ppt.pm_trigger_id', 'left')
            ->join('pm_types ptype', 'ptype.type_id = ppt.pm_type_id', 'left')
            ->join('pm_modes pm', 'pm.mode_id = ppt.pm_mode_id', 'left')
            ->where('ppt.is_active', 1)
            ->get()
            ->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data' => $tasks
        ]);
    }

    public function getPartTasks($partId)
    {
        $model = new \App\Models\PartPmTaskModel();
        $tasks = $model->getPartTasks($partId);

        return $this->respond([
            'status' => 'success',
            'data' => $tasks
        ]);
    }

    private function createSchedule($partPmTaskId, $partId, $scheduledDate)
    {
        $scheduleModel = new \App\Models\PmScheduleModel();
        return $scheduleModel->insert([
            'part_pm_task_id' => $partPmTaskId,
            'part_id' => $partId,
            'scheduled_date' => $scheduledDate,
            'status' => 'pending'
        ]);
    }

    public function generateSchedules()
    {
        $model = new \App\Models\PartPmTaskModel();
        $tasks = $model->where('is_active', 1)->findAll();
        $generated = 0;

        foreach ($tasks as $task) {
            if ($task['next_due_date']) {
                $this->createSchedule($task['id'], $task['part_id'], $task['next_due_date']);
                $generated++;
            }
        }

        return $this->respond([
            'status' => 'success',
            'message' => "{$generated} schedules generated"
        ]);
    }
}
