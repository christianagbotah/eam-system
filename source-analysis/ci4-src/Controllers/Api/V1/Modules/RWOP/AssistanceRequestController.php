<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;
use App\Models\AssistanceRequestModel;
use App\Models\WorkOrderTeamMemberModel;

class AssistanceRequestController extends BaseResourceController
{
    protected $format = 'json';

    public function create()
    {
        $model = new AssistanceRequestModel();
        $data = $this->request->getJSON(true);
        
        $data['requested_by'] = $this->getUserId();
        $data['status'] = 'pending';

        if ($model->insert($data)) {
            $this->sendNotification($data['requested_to'], 'Assistance request received');
            return $this->respondCreated(['status' => 'success', 'message' => 'Request submitted']);
        }

        return $this->fail($model->errors());
    }

    public function approve($id)
    {
        $model = new AssistanceRequestModel();
        $data = $this->request->getJSON(true);
        
        $updateData = [
            'status' => 'approved',
            'approved_by' => $this->getUserId(),
            'approved_at' => date('Y-m-d H:i:s'),
            'assigned_technicians' => json_encode($data['technician_ids'] ?? [])
        ];

        if ($model->update($id, $updateData)) {
            $request = $model->find($id);
            $this->assignTechnicians($request['work_order_id'], $data['technician_ids'] ?? []);
            return $this->respond(['status' => 'success', 'message' => 'Request approved']);
        }

        return $this->fail('Failed to approve request');
    }

    public function reject($id)
    {
        $model = new AssistanceRequestModel();
        $data = $this->request->getJSON(true);
        
        if ($model->update($id, [
            'status' => 'rejected',
            'rejection_reason' => $data['reason'] ?? '',
            'approved_by' => $this->getUserId()
        ])) {
            return $this->respond(['status' => 'success', 'message' => 'Request rejected']);
        }

        return $this->fail('Failed to reject request');
    }

    public function getPending()
    {
        $model = new AssistanceRequestModel();
        $requests = $model->getPendingRequests($this->getUserId());
        
        return $this->respond(['status' => 'success', 'data' => $requests]);
    }

    private function assignTechnicians($workOrderId, $technicianIds)
    {
        $teamModel = new WorkOrderTeamMemberModel();
        
        foreach ($technicianIds as $techId) {
            $teamModel->insert([
                'work_order_id' => $workOrderId,
                'technician_id' => $techId,
                'role' => 'assistant',
                'status' => 'assigned',
                'assigned_by' => $this->getUserId(),
                'assigned_at' => date('Y-m-d H:i:s')
            ]);
        }
    }

    private function sendNotification($userId, $message)
    {
        $db = \Config\Database::connect();
        $db->table('maintenance_notifications')->insert([
            'user_id' => $userId,
            'type' => 'assistance_request',
            'title' => 'Assistance Request',
            'message' => $message,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }

    private function getUserId()
    {
        $userData = \App\Filters\JWTAuthFilter::getUserData();
        return $userData->user_id ?? 1;
    }
}
