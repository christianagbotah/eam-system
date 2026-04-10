<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;

class AuditController extends ResourceController
{
    protected $format = 'json';

    public function logs()
    {
        $db = \Config\Database::connect();
        $limit = $this->request->getGet('limit') ?: 100;
        $offset = $this->request->getGet('offset') ?: 0;
        
        $query = $db->query("
            SELECT 
                al.*,
                u.username,
                u.full_name
            FROM audit_log al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.timestamp DESC
            LIMIT ? OFFSET ?
        ", [$limit, $offset]);
        
        return $this->respond([
            'status' => 'success',
            'data' => $query->getResultArray()
        ]);
    }

    public function logActivity($table, $recordId, $action, $oldValues = null, $newValues = null)
    {
        $db = \Config\Database::connect();
        $userId = $this->request->getHeaderLine('User-ID') ?: 1;
        
        $logId = uniqid();
        $checksum = hash('sha256', $logId . $table . $recordId . $action . time());
        
        $data = [
            'id' => $logId,
            'table_name' => $table,
            'record_id' => $recordId,
            'action' => $action,
            'old_values' => $oldValues ? json_encode($oldValues) : null,
            'new_values' => $newValues ? json_encode($newValues) : null,
            'user_id' => $userId,
            'ip_address' => $this->request->getIPAddress(),
            'user_agent' => $this->request->getUserAgent()->getAgentString(),
            'checksum' => $checksum
        ];
        
        $db->table('audit_log')->insert($data);
        
        return $this->respond(['status' => 'success', 'log_id' => $logId]);
    }

    public function complianceReport()
    {
        $db = \Config\Database::connect();
        
        $query = $db->query("
            SELECT 
                table_name,
                action,
                COUNT(*) as count,
                DATE(timestamp) as date
            FROM audit_log
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY table_name, action, DATE(timestamp)
            ORDER BY date DESC, table_name
        ");
        
        return $this->respond([
            'status' => 'success',
            'data' => $query->getResultArray()
        ]);
    }
}