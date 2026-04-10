<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\Api\V1\BaseResourceController;

class CalibrationController extends BaseResourceController
{
    protected $modelName = 'App\Models\CalibrationScheduleModel';
    protected $format = 'json';

    public function index()
    {
        $status = $this->request->getGet('status');
        $query = $this->model;
        if ($status) {
            $query = $query->where('status', $status);
        }
        $schedules = $query->orderBy('next_calibration_date', 'ASC')->findAll();
        return $this->respond(['status' => 'success', 'data' => $schedules]);
    }

    public function show($id = null)
    {
        $schedule = $this->model->find($id);
        if (!$schedule) {
            return $this->failNotFound('Calibration schedule not found');
        }
        return $this->respond(['status' => 'success', 'data' => $schedule]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        if ($this->model->insert($data)) {
            return $this->respondCreated(['status' => 'success', 'data' => ['id' => $this->model->getInsertID()]]);
        }
        return $this->fail($this->model->errors());
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        if ($this->model->update($id, $data)) {
            return $this->respond(['status' => 'success', 'message' => 'Calibration updated']);
        }
        return $this->fail($this->model->errors());
    }

    public function overdue()
    {
        $overdue = $this->model->where('next_calibration_date <', date('Y-m-d'))
                                ->where('status', 'active')
                                ->findAll();
        return $this->respond(['status' => 'success', 'data' => $overdue]);
    }
}
