<?php

namespace App\Services;

use CodeIgniter\Database\ConnectionInterface;

/**
 * Enterprise Audit Service
 * 
 * Comprehensive audit logging for compliance, security, and traceability.
 * Tracks all critical system actions with user context and metadata.
 * 
 * @package App\Services
 * @version 2.0.0
 */
class AuditService
{
    protected ConnectionInterface $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    /**
     * Log audit trail
     * 
     * @param int $userId
     * @param string $action
     * @param string $entityType
     * @param int $entityId
     * @param string $details
     * @param array $metadata
     * @return bool
     */
    public function log(int $userId, string $action, string $entityType, int $entityId, string $details, array $metadata = []): bool
    {
        try {
            $request = \Config\Services::request();
            
            $this->db->table('audit_logs')->insert([
                'user_id' => $userId,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'details' => $details,
                'metadata' => json_encode($metadata),
                'ip_address' => $request->getIPAddress(),
                'user_agent' => $request->getUserAgent()->getAgentString(),
                'created_at' => date('Y-m-d H:i:s')
            ]);

            return true;
        } catch (\Exception $e) {
            log_message('error', 'Audit log failed: ' . $e->getMessage());
            return false;
        }
    }
}
