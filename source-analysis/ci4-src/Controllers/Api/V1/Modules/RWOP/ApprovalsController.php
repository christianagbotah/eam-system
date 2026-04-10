<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;
use App\Services\RWOP\RwopApprovalService;

class ApprovalsController extends BaseResourceController
{
    protected $format = 'json';

    public function pending()
    {
        $userData = ($GLOBALS['jwt_user_data'] ?? null);
        $userRole = $userData->role ?? 'supervisor';
        
        $db = \Config\Database::connect();
        $approvals = $db->table('rwop_approvals a')
            ->select('a.*, mr.title as request_title, wo.wo_number')
            ->join('maintenance_requests mr', 'mr.id = a.entity_id AND a.entity_type = "maintenance_request"', 'left')
            ->join('work_orders wo', 'wo.id = a.entity_id AND a.entity_type = "work_order"', 'left')
            ->where('a.required_approver_role', $userRole)
            ->where('a.approval_status', 'pending')
            ->orderBy('a.created_at', 'DESC')
            ->get()->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $approvals]);
    }

    public function approve($id)
    {
        $approvalService = new RwopApprovalService();
        $data = $this->request->getJSON(true);
        $userData = ($GLOBALS['jwt_user_data'] ?? null);
        $userId = $userData->user_id ?? 1;
        
        if ($approvalService->processApproval($id, $userId, 'approved', $data['notes'] ?? null)) {
            return $this->respond(['status' => 'success', 'message' => 'Approval processed']);
        }
        
        return $this->fail('Failed to process approval');
    }

    public function reject($id)
    {
        $approvalService = new RwopApprovalService();
        $data = $this->request->getJSON(true);
        $userData = ($GLOBALS['jwt_user_data'] ?? null);
        $userId = $userData->user_id ?? 1;
        
        if ($approvalService->processApproval($id, $userId, 'rejected', $data['notes'] ?? null)) {
            return $this->respond(['status' => 'success', 'message' => 'Approval rejected']);
        }
        
        return $this->fail('Failed to reject approval');
    }
}
