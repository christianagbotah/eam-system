<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseResourceController;
use App\Models\TrainingRecordModel;

class TrainingRecordsController extends BaseResourceController
{
    protected $modelName = 'App\Models\TrainingRecordModel';
    protected $format = 'json';

    public function index()
    {
        $model = new TrainingRecordModel();
        $records = $model->orderBy('training_date', 'DESC')->findAll();

        return $this->respond(['status' => 'success', 'data' => $records]);
    }

    public function show($id = null)
    {
        $model = new TrainingRecordModel();
        $record = $model->find($id);

        if (!$record) {
            return $this->failNotFound('Record not found');
        }

        return $this->respond(['status' => 'success', 'data' => $record]);
    }

    public function create()
    {
        $model = new TrainingRecordModel();
        $data = $this->request->getJSON(true);

        if ($model->insert($data)) {
            return $this->respondCreated(['status' => 'success', 'message' => 'Record created', 'id' => $model->getInsertID()]);
        }

        return $this->fail($model->errors());
    }

    public function update($id = null)
    {
        $model = new TrainingRecordModel();
        $data = $this->request->getJSON(true);

        if ($model->update($id, $data)) {
            return $this->respond(['status' => 'success', 'message' => 'Record updated']);
        }

        return $this->fail($model->errors());
    }

    public function delete($id = null)
    {
        $model = new TrainingRecordModel();

        if ($model->delete($id)) {
            return $this->respondDeleted(['status' => 'success', 'message' => 'Record deleted']);
        }

        return $this->fail('Failed to delete record');
    }

    public function byEmployee($employeeId)
    {
        $model = new TrainingRecordModel();
        $records = $model->where('employee_id', $employeeId)->orderBy('training_date', 'DESC')->findAll();

        return $this->respond(['status' => 'success', 'data' => $records]);
    }

    public function expiring()
    {
        $model = new TrainingRecordModel();
        $expiring = $model->where('expiry_date <=', date('Y-m-d', strtotime('+30 days')))
            ->where('expiry_date >=', date('Y-m-d'))
            ->orderBy('expiry_date', 'ASC')
            ->findAll();

        return $this->respond(['status' => 'success', 'data' => $expiring]);
    }
}
