<?php

namespace App\Services\RWOP;

use App\Services\Core\AuditService;

/**
 * Work Order Service - RWOP Module
 * Handles work order business logic for Ghana industrial operations
 */
class WorkOrderService
{
    protected $db;
    protected $auditService;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->auditService = new AuditService();
    }

    /**
     * Create work order with team assignment
     * Supports: Planner assignment OR Department Supervisor assignment
     */
    public function createWithTeam(array $data, string $userId): array
    {
        $this->db->transStart();

        try {
            // Create work order
            $woData = [
                'work_order_number' => $this->generateWorkOrderNumber(),
                'title' => $data['title'],
                'description' => $data['description'] ?? '',
                'priority' => $data['priority'] ?? 'medium',
                'status' => 'assigned',
                'asset_id' => $data['asset_id'] ?? null,
                'department_id' => $data['department_id'] ?? null,
                'request_id' => $data['request_id'] ?? null,
                'shift_id' => $data['shift_id'] ?? null,
                'assigned_planner_id' => $data['assigned_planner_id'] ?? null,
                'assigned_supervisor_id' => $data['assigned_supervisor_id'] ?? null,
                'team_leader_id' => $data['team_leader_id'] ?? null,
                'union_notification_sent' => false,
                'power_outage_related' => $data['power_outage_related'] ?? false,
                'created_by' => $userId,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];

            $this->db->table('work_orders')->insert($woData);
            $workOrderId = $this->db->insertID();

            // Assign team members if provided
            if (!empty($data['team_members'])) {
                $this->assignTeam($workOrderId, $data['team_members'], $data['team_leader_id']);
            }

            // Send union notification if required
            if (!empty($data['team_members'])) {
                $this->sendUnionNotification($workOrderId);
            }

            $this->db->transComplete();

            if ($this->db->transStatus() === false) {
                return ['success' => false, 'message' => 'Failed to create work order'];
            }

            $this->auditService->log([
                'module_code' => 'RWOP',
                'entity_type' => 'work_orders',
                'entity_id' => $workOrderId,
                'action' => 'create',
                'user_id' => $userId
            ]);

            return ['success' => true, 'work_order_id' => $workOrderId];

        } catch (\Exception $e) {
            $this->db->transRollback();
            log_message('error', 'RWOP: Create work order failed - ' . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Assign team to work order
     * One member must be marked as team leader
     */
    public function assignTeam(string $workOrderId, array $teamMembers, string $leaderId): bool
    {
        foreach ($teamMembers as $member) {
            $teamData = [
                'work_order_id' => $workOrderId,
                'technician_id' => $member['technician_id'],
                'is_leader' => ($member['technician_id'] == $leaderId),
                'assigned_at' => date('Y-m-d H:i:s')
            ];
            $this->db->table('work_order_team_members')->insert($teamData);
        }

        // Update work order with team leader
        $this->db->table('work_orders')
            ->where('id', $workOrderId)
            ->update(['team_leader_id' => $leaderId]);

        return true;
    }

    /**
     * Request assistance (single technician mid-work)
     */
    public function requestAssistance(string $workOrderId, array $data, string $userId): array
    {
        $assistanceData = [
            'work_order_id' => $workOrderId,
            'requested_by' => $userId,
            'reason' => $data['reason'],
            'urgency' => $data['urgency'] ?? 'normal',
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s')
        ];

        $this->db->table('assistance_requests')->insert($assistanceData);
        $requestId = $this->db->insertID();

        $this->auditService->log([
            'module_code' => 'RWOP',
            'entity_type' => 'assistance_requests',
            'entity_id' => $requestId,
            'action' => 'create',
            'user_id' => $userId
        ]);

        return ['success' => true, 'request_id' => $requestId];
    }

    /**
     * Track production loss in GHS (Ghana-specific)
     */
    public function recordProductionLoss(string $workOrderId, float $lossGHS, string $userId): bool
    {
        $this->db->table('work_orders')
            ->where('id', $workOrderId)
            ->update([
                'production_loss_ghs' => $lossGHS,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

        $this->auditService->log([
            'module_code' => 'RWOP',
            'entity_type' => 'work_orders',
            'entity_id' => $workOrderId,
            'action' => 'record_production_loss',
            'user_id' => $userId,
            'changes' => ['production_loss_ghs' => $lossGHS]
        ]);

        return true;
    }

    /**
     * Track forex impact on parts (Ghana-specific)
     */
    public function recordForexImpact(string $workOrderId, float $forexImpactGHS, string $userId): bool
    {
        $this->db->table('work_orders')
            ->where('id', $workOrderId)
            ->update([
                'forex_impact_ghs' => $forexImpactGHS,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

        $this->auditService->log([
            'module_code' => 'RWOP',
            'entity_type' => 'work_orders',
            'entity_id' => $workOrderId,
            'action' => 'record_forex_impact',
            'user_id' => $userId,
            'changes' => ['forex_impact_ghs' => $forexImpactGHS]
        ]);

        return true;
    }

    /**
     * CRITICAL: Complete work order with team leader enforcement
     * Only team leader can submit OR supervisor with override reason
     */
    public function completeWorkOrder(string $workOrderId, array $data, string $userId): array
    {
        // Validate team leader
        $teamMember = $this->db->table('work_order_team_members')
            ->where('work_order_id', $workOrderId)
            ->where('technician_id', $userId)
            ->where('is_leader', true)
            ->get()->getRowArray();

        $isTeamLeader = !empty($teamMember);
        $isSupervisorOverride = !empty($data['override_reason']);

        if (!$isTeamLeader && !$isSupervisorOverride) {
            return [
                'success' => false,
                'code' => 403,
                'message' => 'Only the assigned team leader can submit completion report'
            ];
        }

        // Validate shift handover if multi-shift work
        $handoverValidation = $this->validateShiftHandover($workOrderId);
        if (!$handoverValidation['valid']) {
            return [
                'success' => false,
                'code' => 403,
                'message' => $handoverValidation['message']
            ];
        }

        $this->db->transStart();

        // Update completion report
        $reportData = [
            'work_order_id' => $workOrderId,
            'submitted_by' => $userId,
            'work_performed' => $data['work_performed'] ?? '',
            'findings' => json_encode($data['findings'] ?? []),
            'recommendations' => json_encode($data['recommendations'] ?? []),
            'completion_status' => 'submitted',
            'submitted_at' => date('Y-m-d H:i:s')
        ];

        $existing = $this->db->table('work_order_completion_reports')
            ->where('work_order_id', $workOrderId)->get()->getRowArray();

        if ($existing) {
            $this->db->table('work_order_completion_reports')
                ->where('id', $existing['id'])->update($reportData);
        } else {
            $reportData['created_at'] = date('Y-m-d H:i:s');
            $this->db->table('work_order_completion_reports')->insert($reportData);
        }

        // Update work order status
        $this->db->table('work_orders')
            ->where('id', $workOrderId)
            ->update(['status' => 'completed', 'updated_at' => date('Y-m-d H:i:s')]);

        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return ['success' => false, 'message' => 'Failed to complete work order'];
        }

        // Log with override reason if applicable
        $auditData = ['is_team_leader' => $isTeamLeader];
        if ($isSupervisorOverride) {
            $auditData['override_reason'] = $data['override_reason'];
            $auditData['override_by'] = $userId;
        }

        $this->auditService->log([
            'module_code' => 'RWOP',
            'entity_type' => 'work_orders',
            'entity_id' => $workOrderId,
            'action' => 'complete',
            'user_id' => $userId,
            'changes' => $auditData
        ]);

        return ['success' => true, 'work_order_id' => $workOrderId];
    }

    /**
     * CRITICAL: Validate shift handover before completion
     */
    private function validateShiftHandover(string $workOrderId): array
    {
        $workOrder = $this->db->table('work_orders')
            ->where('id', $workOrderId)->get()->getRowArray();

        if (!$workOrder || !$workOrder['shift_id']) {
            return ['valid' => true]; // No shift tracking
        }

        // Check if work spans multiple shifts
        $timeLogs = $this->db->table('technician_time_logs')
            ->select('DATE(clock_in) as work_date')
            ->where('work_order_id', $workOrderId)
            ->groupBy('work_date')
            ->get()->getResultArray();

        if (count($timeLogs) <= 1) {
            return ['valid' => true]; // Single shift work
        }

        // Validate handover signed off
        $pendingHandover = $this->db->table('shift_handovers')
            ->where('JSON_CONTAINS(pending_work_orders, \'"' . $workOrderId . '"\')', null, false)
            ->where('signed_off', false)
            ->get()->getRowArray();

        if ($pendingHandover) {
            return [
                'valid' => false,
                'message' => 'Work order spans multiple shifts. Incoming supervisor must sign off handover before completion.'
            ];
        }

        return ['valid' => true];
    }

    /**
     * Send union notification (Ghana-specific)
     */
    private function sendUnionNotification(string $workOrderId): bool
    {
        // Mark as sent
        $this->db->table('work_orders')
            ->where('id', $workOrderId)
            ->update(['union_notification_sent' => true]);

        // TODO: Integrate with actual notification system
        log_message('info', "RWOP: Union notification sent for WO {$workOrderId}");
        
        return true;
    }

    /**
     * Generate work order number
     */
    private function generateWorkOrderNumber(): string
    {
        $year = date('Y');
        $month = date('m');
        
        $count = $this->db->table('work_orders')
            ->where('YEAR(created_at)', $year)
            ->where('MONTH(created_at)', $month)
            ->countAllResults();
        
        return sprintf('WO%s%s%04d', $year, $month, $count + 1);
    }
}
