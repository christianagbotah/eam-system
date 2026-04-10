<?php
namespace App\Services\Shift;

use App\Models\ShiftHandoverModel;

class ShiftHandoverService {
    protected $model;

    public function __construct() {
        $this->model = new ShiftHandoverModel();
    }

    public function createHandover($data) {
        $data['handover_code'] = 'SHO-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        $data['handover_time'] = date('Y-m-d H:i:s');
        return $this->model->insert($data);
    }

    public function acceptHandover($id, $userId) {
        return $this->model->update($id, [
            'status' => 'Accepted',
            'accepted_at' => date('Y-m-d H:i:s'),
            'to_operator_id' => $userId
        ]);
    }

    public function rejectHandover($id, $reason) {
        return $this->model->update($id, [
            'status' => 'Rejected',
            'rejected_reason' => $reason
        ]);
    }

    public function listPending($machineId = null) {
        $builder = $this->model->where('status', 'Pending');
        if ($machineId) {
            $builder->where('machine_id', $machineId);
        }
        return $builder->findAll();
    }
}
