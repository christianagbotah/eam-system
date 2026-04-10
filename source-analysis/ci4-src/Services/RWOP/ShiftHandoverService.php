<?php

namespace App\Services\RWOP;

use App\Services\Core\AuditService;

/**
 * Shift Handover Service - RWOP Module
 * Handles shift-based work order handover for Ghana operations
 */
class ShiftHandoverService
{
    protected $db;
    protected $auditService;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->auditService = new AuditService();
    }

    /**
     * Create shift handover for pending work orders
     */
    public function createHandover(array $data, string $userId): array
    {
        $handoverData = [
            'from_shift_id' => $data['from_shift_id'],
            'to_shift_id' => $data['to_shift_id'],
            'handover_date' => date('Y-m-d'),
            'outgoing_supervisor_id' => $userId,
            'pending_work_orders' => json_encode($data['pending_work_orders'] ?? []),
            'equipment_status' => json_encode($data['equipment_status'] ?? []),
            'safety_incidents' => json_encode($data['safety_incidents'] ?? []),
            'production_status' => $data['production_status'] ?? '',
            'signed_off' => false,
            'created_at' => date('Y-m-d H:i:s')
        ];

        $this->db->table('shift_handovers')->insert($handoverData);
        $handoverId = $this->db->insertID();

        $this->auditService->log([
            'module_code' => 'RWOP',
            'entity_type' => 'shift_handovers',
            'entity_id' => $handoverId,
            'action' => 'create',
            'user_id' => $userId
        ]);

        return ['success' => true, 'handover_id' => $handoverId];
    }

    /**
     * Sign off handover by incoming supervisor
     */
    public function signOffHandover(string $handoverId, string $userId): bool
    {
        $this->db->table('shift_handovers')
            ->where('id', $handoverId)
            ->update([
                'incoming_supervisor_id' => $userId,
                'signed_off' => true,
                'signed_off_at' => date('Y-m-d H:i:s')
            ]);

        $this->auditService->log([
            'module_code' => 'RWOP',
            'entity_type' => 'shift_handovers',
            'entity_id' => $handoverId,
            'action' => 'sign_off',
            'user_id' => $userId
        ]);

        return true;
    }

    /**
     * Get pending handovers for shift
     */
    public function getPendingHandovers(string $shiftId): array
    {
        return $this->db->table('shift_handovers')
            ->where('to_shift_id', $shiftId)
            ->where('signed_off', false)
            ->orderBy('created_at', 'DESC')
            ->get()
            ->getResultArray();
    }
}
