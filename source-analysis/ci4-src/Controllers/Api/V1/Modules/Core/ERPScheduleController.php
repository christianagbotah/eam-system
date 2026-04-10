<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class ERPScheduleController extends ResourceController
{
    protected $modelName = 'App\Models\ERPScheduleModel';
    protected $format = 'json';

    public function index()
    {
        $schedules = $this->model->orderBy('entity_type', 'ASC')->findAll();
        
        foreach ($schedules as &$schedule) {
            if ($schedule['is_active'] && !$schedule['next_run']) {
                $schedule['next_run'] = $this->calculateNextRun($schedule);
            }
        }
        
        return $this->respond(['status' => 'success', 'data' => $schedules]);
    }

    public function show($id = null)
    {
        $schedule = $this->model->find($id);
        if (!$schedule) {
            return $this->failNotFound('Schedule not found');
        }
        return $this->respond(['status' => 'success', 'data' => $schedule]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        
        if ($this->model->insert($data)) {
            $id = $this->model->getInsertID();
            $schedule = $this->model->find($id);
            
            if ($schedule['is_active']) {
                $nextRun = $this->calculateNextRun($schedule);
                $this->model->update($id, ['next_run' => $nextRun]);
            }
            
            return $this->respondCreated(['status' => 'success', 'data' => $schedule]);
        }
        
        return $this->fail($this->model->errors());
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        
        if ($this->model->update($id, $data)) {
            $schedule = $this->model->find($id);
            
            if ($schedule['is_active']) {
                $nextRun = $this->calculateNextRun($schedule);
                $this->model->update($id, ['next_run' => $nextRun]);
            } else {
                $this->model->update($id, ['next_run' => null]);
            }
            
            return $this->respond(['status' => 'success', 'data' => $schedule]);
        }
        
        return $this->fail($this->model->errors());
    }

    public function delete($id = null)
    {
        if ($this->model->delete($id)) {
            return $this->respondDeleted(['status' => 'success', 'message' => 'Schedule deleted']);
        }
        return $this->failNotFound('Schedule not found');
    }

    private function calculateNextRun($schedule)
    {
        $now = new \DateTime();
        
        switch ($schedule['frequency']) {
            case 'hourly':
                $now->modify('+1 hour');
                return $now->format('Y-m-d H:00:00');
                
            case 'daily':
                $time = $schedule['time_of_day'] ?: '02:00:00';
                $next = new \DateTime('tomorrow ' . $time);
                if ($now->format('H:i') < substr($time, 0, 5)) {
                    $next = new \DateTime('today ' . $time);
                }
                return $next->format('Y-m-d H:i:s');
                
            case 'weekly':
                $dayOfWeek = $schedule['day_of_week'] ?? 1;
                $time = $schedule['time_of_day'] ?: '02:00:00';
                $next = new \DateTime('next ' . ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][$dayOfWeek] . ' ' . $time);
                return $next->format('Y-m-d H:i:s');
        }
        
        return null;
    }
}
