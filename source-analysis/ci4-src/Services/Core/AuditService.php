<?php

namespace App\Services\Core;

/**
 * Audit Service - CORE Module
 * Standardized audit logging for Ghana compliance
 */
class AuditService
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function log(array $data): bool
    {
        try {
            $logData = [
                'module_code' => $data['module_code'] ?? 'CORE',
                'entity_type' => $data['entity_type'],
                'entity_id' => $data['entity_id'],
                'action' => $data['action'],
                'user_id' => $data['user_id'],
                'changes' => isset($data['changes']) ? json_encode($data['changes']) : null,
                'ip_address' => $data['ip_address'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $data['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? null,
                'created_at' => date('Y-m-d H:i:s')
            ];

            return $this->db->table('audit_logs')->insert($logData);
        } catch (\Exception $e) {
            log_message('error', 'Audit log failed: ' . $e->getMessage());
            return false;
        }
    }

    public function getTrail(string $entityType, string $entityId): array
    {
        return $this->db->table('audit_logs')
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->orderBy('created_at', 'DESC')
            ->get()
            ->getResultArray();
    }
}
