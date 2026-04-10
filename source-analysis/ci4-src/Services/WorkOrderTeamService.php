<?php

namespace App\Services;

use App\Models\WorkOrderModel;
use CodeIgniter\Database\ConnectionInterface;
use CodeIgniter\Log\Logger;

/**
 * Work Order Team Management Service
 * 
 * Handles all business logic for multi-technician work order assignments,
 * time tracking, team coordination, and performance analytics.
 * 
 * @package App\Services
 * @version 2.0.0
 */
class WorkOrderTeamService
{
    protected ConnectionInterface $db;
    protected Logger $logger;
    protected NotificationService $notificationService;
    protected AuditService $auditService;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->logger = service('logger');
        $this->notificationService = new NotificationService();
        $this->auditService = new AuditService();
    }

    /**
     * Get work order with team members
     * 
     * @param int $workOrderId
     * @return array
     * @throws \RuntimeException
     */
    public function getWorkOrderTeam(int $workOrderId): array
    {
        $workOrder = $this->db->table('work_orders')->where('id', $workOrderId)->get()->getRowArray();
        if (!$workOrder) {
            throw new \RuntimeException('Work order not found');
        }
        
        $teamMembers = $this->db->table('work_order_team_members wotm')
            ->select('wotm.*, u.username, u.email, u.full_name')
            ->join('users u', 'u.id = wotm.technician_id', 'left')
            ->where('wotm.work_order_id', $workOrderId)
            ->orderBy('wotm.is_leader', 'DESC')
            ->get()
            ->getResultArray();
        
        return [
            'work_order' => $workOrder,
            'team_members' => $teamMembers
        ];
    }

    /**
     * Forward work order to supervisor
     * 
     * @param int $workOrderId
     * @param int $supervisorId
     * @param int $forwardedBy
     * @return array
     */
    public function forwardToSupervisor(int $workOrderId, int $supervisorId, int $forwardedBy): array
    {
        $this->db->transStart();
        
        try {
            $supervisor = $this->db->table('users')
                ->where('id', $supervisorId)
                ->whereIn('role', ['supervisor', 'manager'])
                ->get()->getRowArray();
            
            if (!$supervisor) {
                throw new \RuntimeException('Invalid supervisor');
            }

            $this->db->table('work_orders')->where('id', $workOrderId)->update([
                'assigned_supervisor_id' => $supervisorId,
                'forwarded_by' => $forwardedBy,
                'forwarded_at' => date('Y-m-d H:i:s'),
                'assignment_type' => 'via_supervisor',
                'status' => 'forwarded',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            $workOrder = $this->db->table('work_orders')->where('id', $workOrderId)->get()->getRowArray();
            
            $this->notificationService->send(
                $supervisorId,
                'work_order_forwarded',
                'Work Order Forwarded',
                "Work order {$workOrder['wo_number']} forwarded to you for assignment",
                ['work_order_id' => $workOrderId]
            );

            $this->db->transComplete();
            return ['success' => true];
        } catch (\Exception $e) {
            $this->db->transRollback();
            throw $e;
        }
    }

    /**
     * Approve help request and add technicians
     * 
     * @param int $requestId
     * @param int $approvedBy
     * @return void
     * @throws \RuntimeException
     */
    public function approveHelpRequest(int $requestId, int $approvedBy): void
    {
        $this->db->transStart();
        
        try {
            $helpRequest = $this->db->table('work_order_help_requests')->where('id', $requestId)->get()->getRowArray();
            
            if (!$helpRequest) {
                throw new \RuntimeException('Help request not found');
            }
            
            if ($helpRequest['status'] !== 'pending') {
                throw new \RuntimeException('Help request already processed');
            }
            
            $technicianIds = json_decode($helpRequest['requested_technicians'], true);
            
            foreach ($technicianIds as $techId) {
                $this->db->table('work_order_team_members')->insert([
                    'work_order_id' => $helpRequest['work_order_id'],
                    'technician_id' => $techId,
                    'role' => 'assistant',
                    'is_leader' => 0,
                    'assigned_by' => $approvedBy,
                    'assigned_at' => date('Y-m-d H:i:s'),
                    'status' => 'assigned',
                    'notes' => 'Added as additional help',
                    'created_at' => date('Y-m-d H:i:s')
                ]);
                
                $this->notificationService->send(
                    $techId,
                    'work_order_assigned',
                    'Assigned as Additional Help',
                    "You have been assigned to work order as additional help",
                    ['work_order_id' => $helpRequest['work_order_id']]
                );
            }
            
            $this->db->table('work_order_help_requests')
                ->where('id', $requestId)
                ->update([
                    'status' => 'approved',
                    'approved_by' => $approvedBy,
                    'approved_at' => date('Y-m-d H:i:s')
                ]);
            
            $this->db->transComplete();
            
            if ($this->db->transStatus() === false) {
                throw new \RuntimeException('Transaction failed');
            }
            
        } catch (\Exception $e) {
            $this->db->transRollback();
            throw $e;
        }
    }

    /**
     * Assign multiple technicians to work order with team leader
     * 
     * @param int $workOrderId
     * @param array $technicians [{technician_id, skill}]
     * @param int $teamLeaderId
     * @param int $assignedBy
     * @return array
     * @throws \RuntimeException
     */
    public function assignTeam(int $workOrderId, array $technicians, int $teamLeaderId, int $assignedBy): array
    {
        $this->db->transStart();
        
        try {
            // Validate work order exists
            $workOrder = $this->db->table('work_orders')->where('id', $workOrderId)->get()->getRowArray();
            if (!$workOrder) {
                throw new \RuntimeException("Work order #{$workOrderId} not found");
            }

            // Validate team leader is in technicians list
            $techIds = array_column($technicians, 'technician_id');
            if (!in_array($teamLeaderId, $techIds)) {
                throw new \RuntimeException("Team leader must be one of the assigned technicians");
            }

            // Validate all technicians exist and are active
            $this->validateTechnicians($techIds);

            // Remove existing team members (for updates)
            $this->db->table('work_order_team_members')
                ->where('work_order_id', $workOrderId)
                ->delete();

            // Insert team members
            $insertedMembers = [];
            foreach ($technicians as $tech) {
                $memberData = [
                    'work_order_id' => $workOrderId,
                    'technician_id' => $tech['technician_id'],
                    'role' => $tech['technician_id'] == $teamLeaderId ? 'leader' : 'assistant',
                    'is_leader' => $tech['technician_id'] == $teamLeaderId ? 1 : 0,
                    'assigned_by' => $assignedBy,
                    'assigned_at' => date('Y-m-d H:i:s'),
                    'status' => 'assigned',
                    'notes' => 'Skill: ' . ($tech['skill'] ?? 'general'),
                    'created_at' => date('Y-m-d H:i:s')
                ];

                $this->db->table('work_order_team_members')->insert($memberData);
                $insertedMembers[] = array_merge($memberData, ['id' => $this->db->insertID()]);

                // Send notification
                $this->notificationService->send(
                    $tech['technician_id'],
                    'work_order_assigned',
                    'Work Order Assignment',
                    "You have been assigned to work order {$workOrder['work_order_number']}" .
                    ($tech['technician_id'] == $teamLeaderId ? ' as Team Leader' : ''),
                    ['work_order_id' => $workOrderId]
                );
            }

            // Update work order with team leader
            $this->db->table('work_orders')
                ->where('id', $workOrderId)
                ->update([
                    'assigned_to' => $teamLeaderId,
                    'team_leader_id' => $teamLeaderId,
                    'updated_at' => date('Y-m-d H:i:s')
                ]);

            // Audit log
            $this->auditService->log(
                $assignedBy,
                'team_assigned',
                'work_order',
                $workOrderId,
                "Assigned team of " . count($technicians) . " technicians to work order {$workOrder['work_order_number']}"
            );

            $this->db->transComplete();

            if ($this->db->transStatus() === false) {
                throw new \RuntimeException("Transaction failed");
            }

            $this->logger->info("Team assigned to work order #{$workOrderId}", [
                'work_order_id' => $workOrderId,
                'team_size' => count($technicians),
                'team_leader_id' => $teamLeaderId
            ]);

            return [
                'success' => true,
                'team_members' => $insertedMembers,
                'team_size' => count($insertedMembers)
            ];

        } catch (\Exception $e) {
            $this->db->transRollback();
            $this->logger->error("Failed to assign team to work order #{$workOrderId}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Record technician start time
     * 
     * @param int $workOrderId
     * @param int $technicianId
     * @return array
     */
    public function startWork(int $workOrderId, int $technicianId): array
    {
        try {
            $member = $this->getTeamMember($workOrderId, $technicianId);

            if ($member['start_time']) {
                throw new \RuntimeException("Work already started at " . $member['start_time']);
            }

            $this->db->table('work_order_team_members')
                ->where('id', $member['id'])
                ->update([
                    'start_time' => date('Y-m-d H:i:s'),
                    'status' => 'active',
                    'updated_at' => date('Y-m-d H:i:s')
                ]);

            $this->auditService->log(
                $technicianId,
                'work_started',
                'work_order_team_member',
                $member['id'],
                "Started work on work order #{$workOrderId}"
            );

            $this->logger->info("Technician #{$technicianId} started work on WO #{$workOrderId}");

            return ['success' => true, 'start_time' => date('Y-m-d H:i:s')];

        } catch (\Exception $e) {
            $this->logger->error("Failed to start work: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Record technician end time and calculate hours
     * 
     * @param int $workOrderId
     * @param int $technicianId
     * @return array
     */
    public function endWork(int $workOrderId, int $technicianId): array
    {
        try {
            $member = $this->getTeamMember($workOrderId, $technicianId);

            if (!$member['start_time']) {
                throw new \RuntimeException("Work not started yet");
            }

            if ($member['end_time']) {
                throw new \RuntimeException("Work already ended at " . $member['end_time']);
            }

            $endTime = date('Y-m-d H:i:s');
            $hoursWorked = $this->calculateHours($member['start_time'], $endTime);

            $this->db->table('work_order_team_members')
                ->where('id', $member['id'])
                ->update([
                    'end_time' => $endTime,
                    'hours_worked' => $hoursWorked,
                    'status' => 'completed',
                    'updated_at' => $endTime
                ]);

            $this->auditService->log(
                $technicianId,
                'work_completed',
                'work_order_team_member',
                $member['id'],
                "Completed work on work order #{$workOrderId} - {$hoursWorked} hours"
            );

            $this->logger->info("Technician #{$technicianId} completed work on WO #{$workOrderId}", [
                'hours_worked' => $hoursWorked
            ]);

            return [
                'success' => true,
                'end_time' => $endTime,
                'hours_worked' => $hoursWorked
            ];

        } catch (\Exception $e) {
            $this->logger->error("Failed to end work: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Request additional help (team leader only)
     * 
     * @param int $workOrderId
     * @param int $requestedBy
     * @param array $technicianIds
     * @param string $reason
     * @return array
     */
    public function requestAdditionalHelp(int $workOrderId, int $requestedBy, array $technicianIds, string $reason): array
    {
        $this->db->transStart();

        try {
            // Verify requester is team leader
            $member = $this->getTeamMember($workOrderId, $requestedBy);
            if (!$member['is_leader']) {
                throw new \RuntimeException("Only team leader can request additional help");
            }

            // Validate requested technicians
            $this->validateTechnicians($technicianIds);

            // Create help request
            $requestData = [
                'work_order_id' => $workOrderId,
                'requested_by' => $requestedBy,
                'requested_technicians' => json_encode($technicianIds),
                'reason' => $reason,
                'status' => 'pending',
                'created_at' => date('Y-m-d H:i:s')
            ];

            $this->db->table('work_order_help_requests')->insert($requestData);
            $requestId = $this->db->insertID();

            // Notify planner/supervisor
            $workOrder = $this->db->table('work_orders')->where('id', $workOrderId)->get()->getRowArray();
            if ($workOrder['created_by']) {
                $this->notificationService->send(
                    $workOrder['created_by'],
                    'help_requested',
                    'Additional Help Requested',
                    "Team leader requested " . count($technicianIds) . " additional technician(s) for WO {$workOrder['work_order_number']}",
                    ['help_request_id' => $requestId, 'work_order_id' => $workOrderId]
                );
            }

            $this->auditService->log(
                $requestedBy,
                'help_requested',
                'work_order_help_request',
                $requestId,
                "Requested additional help for work order #{$workOrderId}"
            );

            $this->db->transComplete();

            $this->logger->info("Help requested for WO #{$workOrderId}", [
                'requested_by' => $requestedBy,
                'technician_count' => count($technicianIds)
            ]);

            return ['success' => true, 'request_id' => $requestId];

        } catch (\Exception $e) {
            $this->db->transRollback();
            $this->logger->error("Failed to request help: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get team performance metrics
     * 
     * @param int $workOrderId
     * @return array
     */
    public function getTeamMetrics(int $workOrderId): array
    {
        $members = $this->db->table('work_order_team_members wotm')
            ->select('wotm.*, u.username, u.full_name')
            ->join('users u', 'u.id = wotm.technician_id', 'left')
            ->where('wotm.work_order_id', $workOrderId)
            ->orderBy('wotm.is_leader', 'DESC')
            ->get()
            ->getResultArray();

        $totalHours = array_sum(array_filter(array_column($members, 'hours_worked')));
        $avgHours = count($members) > 0 ? $totalHours / count($members) : 0;

        return [
            'team_members' => $members,
            'team_size' => count($members),
            'total_hours' => round($totalHours, 2),
            'average_hours' => round($avgHours, 2),
            'completed_count' => count(array_filter($members, fn($m) => $m['status'] === 'completed')),
            'active_count' => count(array_filter($members, fn($m) => $m['status'] === 'active')),
            'assigned_count' => count(array_filter($members, fn($m) => $m['status'] === 'assigned'))
        ];
    }

    /**
     * Validate technicians exist and are active
     * 
     * @param array $technicianIds
     * @throws \RuntimeException
     */
    private function validateTechnicians(array $technicianIds): void
    {
        $technicians = $this->db->table('users')
            ->whereIn('id', $technicianIds)
            ->where('role', 'technician')
            ->where('employment_status', 'active')
            ->get()
            ->getResultArray();

        if (count($technicians) !== count($technicianIds)) {
            throw new \RuntimeException("One or more technicians are invalid or inactive");
        }
    }

    /**
     * Get team member record
     * 
     * @param int $workOrderId
     * @param int $technicianId
     * @return array
     * @throws \RuntimeException
     */
    private function getTeamMember(int $workOrderId, int $technicianId): array
    {
        $member = $this->db->table('work_order_team_members')
            ->where('work_order_id', $workOrderId)
            ->where('technician_id', $technicianId)
            ->get()
            ->getRowArray();

        if (!$member) {
            throw new \RuntimeException("Technician not assigned to this work order");
        }

        return $member;
    }

    /**
     * Calculate hours between two timestamps
     * 
     * @param string $startTime
     * @param string $endTime
     * @return float
     */
    private function calculateHours(string $startTime, string $endTime): float
    {
        $start = new \DateTime($startTime);
        $end = new \DateTime($endTime);
        $interval = $start->diff($end);
        
        return round($interval->h + ($interval->i / 60) + ($interval->days * 24), 2);
    }

    /**
     * Submit completion report
     * 
     * @param int $workOrderId
     * @param int $submittedBy
     * @param array $reportData
     * @return array
     */
    public function submitCompletionReport(int $workOrderId, int $submittedBy, array $reportData): array
    {
        $this->db->transStart();
        
        try {
            $teamMembers = $this->db->table('work_order_team_members wotm')
                ->select('wotm.*, u.full_name, u.username, u.trade')
                ->join('users u', 'u.id = wotm.technician_id', 'left')
                ->where('wotm.work_order_id', $workOrderId)
                ->get()
                ->getResultArray();

            $teamMembersData = array_map(function($member) {
                return [
                    'technician_id' => $member['technician_id'],
                    'name' => $member['full_name'] ?: $member['username'],
                    'trade' => $member['trade'] ?: 'General',
                    'role' => $member['role'],
                    'is_leader' => $member['is_leader'],
                    'start_time' => $member['start_time'],
                    'end_time' => $member['end_time'],
                    'hours_worked' => $member['hours_worked']
                ];
            }, $teamMembers);

            $this->db->table('work_order_completion_reports')->insert([
                'work_order_id' => $workOrderId,
                'submitted_by' => $submittedBy,
                'work_performed' => $reportData['work_performed'],
                'findings' => $reportData['findings'] ?? null,
                'recommendations' => $reportData['recommendations'] ?? null,
                'team_members_data' => json_encode($teamMembersData),
                'materials_used' => json_encode($reportData['materials_used'] ?? []),
                'completion_status' => $reportData['completion_status'] ?? 'completed',
                'submitted_at' => date('Y-m-d H:i:s'),
                'created_at' => date('Y-m-d H:i:s')
            ]);

            $this->db->table('work_orders')->where('id', $workOrderId)->update([
                'status' => 'completed',
                'actual_end' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            $this->db->transComplete();
            return ['success' => true, 'report_id' => $this->db->insertID()];
        } catch (\Exception $e) {
            $this->db->transRollback();
            throw $e;
        }
    }
}
