<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\TrainingRecordModel;

class TrainingRecordsController extends BaseApiController
{
    protected $modelName = 'App\Models\TrainingRecordModel';
    protected $format = 'json';

    public function index()
    {
        // Permission check
        if (!$this->checkPermission('user', 'view')) {
            return $this->failForbidden('Insufficient permissions to view training records');
        }

        $model = new TrainingRecordModel();
        $records = $model->orderBy('training_date', 'DESC')->findAll();

        // Audit log
        $this->auditLog('VIEW', 'training_records', 0, null, ['count' => count($records)]);

        return $this->respond(['status' => 'success', 'data' => $records]);
    }

    public function show($id = null)
    {
        // Permission check
        if (!$this->checkPermission('user', 'view')) {
            return $this->failForbidden('Insufficient permissions to view training record details');
        }

        $model = new TrainingRecordModel();
        $record = $model->find($id);

        if (!$record) {
            return $this->failNotFound('Record not found');
        }

        // Audit log
        $this->auditLog('VIEW_DETAIL', 'training_records', $id);

        return $this->respond(['status' => 'success', 'data' => $record]);
    }

    public function create()
    {
        // Permission check
        if (!$this->checkPermission('user', 'create')) {
            return $this->failForbidden('Insufficient permissions to create training records');
        }

        $model = new TrainingRecordModel();
        $data = $this->request->getJSON(true);

        if ($model->insert($data)) {
            $newId = $model->getInsertID();

            // Audit log
            $this->auditLog('CREATE', 'training_records', $newId, null, $data);

            return $this->respondCreated(['status' => 'success', 'message' => 'Record created', 'id' => $newId]);
        }

        return $this->fail($model->errors());
    }

    public function update($id = null)
    {
        // Permission check
        if (!$this->checkPermission('user', 'update')) {
            return $this->failForbidden('Insufficient permissions to update training records');
        }

        $model = new TrainingRecordModel();
        $data = $this->request->getJSON(true);

        if ($model->update($id, $data)) {
            // Audit log
            $this->auditLog('UPDATE', 'training_records', $id, null, $data);

            return $this->respond(['status' => 'success', 'message' => 'Record updated']);
        }

        return $this->fail($model->errors());
    }

    public function delete($id = null)
    {
        // Permission check
        if (!$this->checkPermission('user', 'delete')) {
            return $this->failForbidden('Insufficient permissions to delete training records');
        }

        $model = new TrainingRecordModel();

        if ($model->delete($id)) {
            // Audit log
            $this->auditLog('DELETE', 'training_records', $id, null, null);

            return $this->respondDeleted(['status' => 'success', 'message' => 'Record deleted']);
        }

        return $this->fail('Failed to delete record');
    }

    public function byEmployee($employeeId)
    {
        // Permission check
        if (!$this->checkPermission('user', 'view')) {
            return $this->failForbidden('Insufficient permissions to view employee training records');
        }

        $model = new TrainingRecordModel();
        $records = $model->where('employee_id', $employeeId)->orderBy('training_date', 'DESC')->findAll();

        // Audit log
        $this->auditLog('VIEW', 'training_records_by_employee', $employeeId, null, ['count' => count($records)]);

        return $this->respond(['status' => 'success', 'data' => $records]);
    }

    public function expiring()
    {
        // Permission check
        if (!$this->checkPermission('user', 'view')) {
            return $this->failForbidden('Insufficient permissions to view expiring training records');
        }

        $model = new TrainingRecordModel();
        $expiring = $model->where('expiry_date <=', date('Y-m-d', strtotime('+30 days')))
            ->where('expiry_date >=', date('Y-m-d'))
            ->orderBy('expiry_date', 'ASC')
            ->findAll();

        // Audit log
        $this->auditLog('VIEW', 'expiring_training_records', 0, null, ['count' => count($expiring)]);

        return $this->respond(['status' => 'success', 'data' => $expiring]);
    }
}
