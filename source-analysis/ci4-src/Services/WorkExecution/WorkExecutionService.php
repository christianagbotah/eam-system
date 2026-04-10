<?php
namespace App\Services\WorkExecution;

use App\Models\WorkExecutionModel;

class WorkExecutionService {
    protected $model;

    public function __construct() {
        $this->model = new WorkExecutionModel();
    }

    public function startExecution($woId, $techId) {
        $code = 'WEX-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        return $this->model->insert([
            'execution_code' => $code,
            'work_order_id' => $woId,
            'technician_id' => $techId,
            'start_time' => date('Y-m-d H:i:s'),
            'status' => 'InProgress'
        ]);
    }

    public function pauseExecution($id, $reason) {
        return $this->model->update($id, [
            'status' => 'Paused',
            'pause_reason' => $reason,
            'paused_at' => date('Y-m-d H:i:s')
        ]);
    }

    public function resumeExecution($id) {
        return $this->model->update($id, ['status' => 'InProgress']);
    }

    public function completeExecution($id, $payload) {
        $execution = $this->model->find($id);
        $hours = round((time() - strtotime($execution['start_time'])) / 3600, 2);
        
        return $this->model->update($id, array_merge($payload, [
            'end_time' => date('Y-m-d H:i:s'),
            'actual_hours' => $hours,
            'status' => 'Completed',
            'completed_at' => date('Y-m-d H:i:s')
        ]));
    }
}
