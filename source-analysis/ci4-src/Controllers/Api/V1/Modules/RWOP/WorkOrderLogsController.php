<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;
use App\Models\WorkOrderLog;

class WorkOrderLogsController extends BaseResourceController
{
    protected $model;
    protected $format = 'json';

    public function __construct()
    {
        $this->model = new WorkOrderLog();
    }

    public function index($woId = null)
    {
        $logs = $this->model
            ->select('work_order_logs.*, users.username')
            ->join('users', 'users.id = work_order_logs.user_id', 'left')
            ->where('work_order_id', $woId)
            ->orderBy('created_at', 'DESC')
            ->findAll();

        return $this->respond([
            'status' => 'success',
            'data' => $logs
        ]);
    }

    public function create($woId = null)
    {
        $data = $this->request->getJSON(true);
        $data['work_order_id'] = $woId;
        $data['user_id'] = $this->getUserId();

        if ($this->model->insert($data)) {
            $log = $this->model->find($this->model->getInsertID());
            return $this->respondCreated([
                'status' => 'success',
                'data' => $log
            ]);
        }

        return $this->fail($this->model->errors());
    }

    protected function getUserId(): int
    {
        return 1; // Placeholder - get from JWT token
    }
}
