<?php

namespace App\Controllers\Api\V1\Modules\TRAC;

use App\Controllers\Api\V1\BaseResourceController;
use CodeIgniter\API\ResponseTrait;

class PermitToWorkController extends BaseResourceController
{
    use ResponseTrait;

    protected $permitModel;
    protected $approvalModel;
    protected $extensionModel;

    public function __construct()
    {
        $this->permitModel = model('PermitToWorkModel');
        $this->approvalModel = model('PermitApprovalModel');
        $this->extensionModel = model('PermitExtensionModel');
    }

    public function index()
    {
        $status = $this->request->getGet('status');
        $type = $this->request->getGet('type');
        
        $builder = $this->permitModel
            ->select('permits_to_work.*, users.name as requested_by_name')
            ->join('users', 'users.id = permits_to_work.requested_by');
        
        if ($status) $builder->where('permits_to_work.status', $status);
        if ($type) $builder->where('permit_type', $type);
        
        $permits = $builder->orderBy('created_at', 'DESC')->findAll();
        
        return $this->respond(['status' => 'success', 'data' => $permits]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        $userId = $this->request->user_id ?? 1;
        
        // Generate permit number
        $data['permit_number'] = $this->generatePermitNumber($data['permit_type']);
        $data['requested_by'] = $userId;
        $data['status'] = 'draft';
        $data['created_at'] = date('Y-m-d H:i:s');
        
        $id = $this->permitModel->insert($data);
        
        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Permit created successfully',
            'data' => ['id' => $id, 'permit_number' => $data['permit_number']]
        ]);
    }

    public function submitForApproval($id)
    {
        $permit = $this->permitModel->find($id);
        if (!$permit) return $this->failNotFound('Permit not found');
        
        // Validate required fields
        if (empty($permit['hazards_identified']) || empty($permit['control_measures'])) {
            return $this->fail('Risk assessment must be completed before submission');
        }
        
        $this->permitModel->update($id, ['status' => 'pending_approval']);
        
        // Create approval records
        $approvals = [
            ['permit_id' => $id, 'approval_level' => 'supervisor', 'created_at' => date('Y-m-d H:i:s')],
            ['permit_id' => $id, 'approval_level' => 'safety_officer', 'created_at' => date('Y-m-d H:i:s')],
        ];
        
        if ($permit['risk_level'] === 'critical' || $permit['risk_level'] === 'high') {
            $approvals[] = ['permit_id' => $id, 'approval_level' => 'area_manager', 'created_at' => date('Y-m-d H:i:s')];
        }
        
        $this->approvalModel->insertBatch($approvals);
        
        // Send notifications
        $this->sendApprovalNotifications($id);
        
        return $this->respond(['status' => 'success', 'message' => 'Permit submitted for approval']);
    }

    public function approve($id)
    {
        $userId = $this->request->user_id ?? 1;
        $input = $this->request->getJSON(true);
        
        $approval = $this->approvalModel
            ->where('permit_id', $id)
            ->where('approver_id', $userId)
            ->where('approved IS NULL')
            ->first();
        
        if (!$approval) return $this->fail('No pending approval found for this user');
        
        $this->approvalModel->update($approval['id'], [
            'approved' => true,
            'comments' => $input['comments'] ?? null,
            'approved_at' => date('Y-m-d H:i:s')
        ]);
        
        // Check if all approvals complete
        $pendingApprovals = $this->approvalModel
            ->where('permit_id', $id)
            ->where('approved IS NULL')
            ->countAllResults();
        
        if ($pendingApprovals === 0) {
            $this->permitModel->update($id, ['status' => 'approved']);
        }
        
        return $this->respond(['status' => 'success', 'message' => 'Permit approved']);
    }

    public function reject($id)
    {
        $userId = $this->request->user_id ?? 1;
        $input = $this->request->getJSON(true);
        
        $approval = $this->approvalModel
            ->where('permit_id', $id)
            ->where('approver_id', $userId)
            ->first();
        
        if (!$approval) return $this->fail('Approval record not found');
        
        $this->approvalModel->update($approval['id'], [
            'approved' => false,
            'comments' => $input['reason'] ?? 'Rejected',
            'approved_at' => date('Y-m-d H:i:s')
        ]);
        
        $this->permitModel->update($id, ['status' => 'cancelled']);
        
        return $this->respond(['status' => 'success', 'message' => 'Permit rejected']);
    }

    public function startWork($id)
    {
        $permit = $this->permitModel->find($id);
        if (!$permit) return $this->failNotFound('Permit not found');
        
        if ($permit['status'] !== 'approved') {
            return $this->fail('Permit must be approved before starting work');
        }
        
        // Check validity
        if (strtotime($permit['valid_from']) > time()) {
            return $this->fail('Permit is not yet valid');
        }
        
        if (strtotime($permit['valid_until']) < time()) {
            return $this->fail('Permit has expired');
        }
        
        $this->permitModel->update($id, [
            'status' => 'active',
            'work_started_at' => date('Y-m-d H:i:s')
        ]);
        
        return $this->respond(['status' => 'success', 'message' => 'Work started']);
    }

    public function completeWork($id)
    {
        $input = $this->request->getJSON(true);
        $userId = $this->request->user_id ?? 1;
        
        $this->permitModel->update($id, [
            'status' => 'completed',
            'work_completed_at' => date('Y-m-d H:i:s'),
            'permit_closed_by' => $userId,
            'permit_closed_at' => date('Y-m-d H:i:s'),
            'post_work_inspection' => json_encode($input['post_work_inspection'] ?? []),
            'incidents_reported' => $input['incidents_reported'] ?? null
        ]);
        
        return $this->respond(['status' => 'success', 'message' => 'Permit closed successfully']);
    }

    public function extend($id)
    {
        $input = $this->request->getJSON(true);
        $userId = $this->request->user_id ?? 1;
        
        $permit = $this->permitModel->find($id);
        if (!$permit) return $this->failNotFound('Permit not found');
        
        $extensionData = [
            'permit_id' => $id,
            'extended_by' => $userId,
            'reason' => $input['reason'],
            'previous_valid_until' => $permit['valid_until'],
            'new_valid_until' => $input['new_valid_until'],
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $this->extensionModel->insert($extensionData);
        
        $this->permitModel->update($id, [
            'valid_until' => $input['new_valid_until'],
            'extended' => true
        ]);
        
        return $this->respond(['status' => 'success', 'message' => 'Permit extended']);
    }

    public function dashboard()
    {
        $stats = [
            'active' => $this->permitModel->where('status', 'active')->countAllResults(),
            'pending_approval' => $this->permitModel->where('status', 'pending_approval')->countAllResults(),
            'expiring_today' => $this->permitModel
                ->where('status', 'active')
                ->where('DATE(valid_until)', date('Y-m-d'))
                ->countAllResults(),
            'by_type' => $this->permitModel
                ->select('permit_type, COUNT(*) as count')
                ->where('status', 'active')
                ->groupBy('permit_type')
                ->findAll()
        ];
        
        return $this->respond(['status' => 'success', 'data' => $stats]);
    }

    private function generatePermitNumber($type)
    {
        $prefix = strtoupper(substr($type, 0, 2));
        $date = date('Ymd');
        $count = $this->permitModel
            ->where('DATE(created_at)', date('Y-m-d'))
            ->countAllResults() + 1;
        
        return sprintf('%s-%s-%04d', $prefix, $date, $count);
    }

    private function sendApprovalNotifications($permitId)
    {
        // Implementation for sending notifications
    }
}
