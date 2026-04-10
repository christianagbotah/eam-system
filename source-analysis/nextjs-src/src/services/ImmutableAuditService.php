<?php

namespace App\Services;

class ImmutableAuditService
{
    private $db;
    private $secretKey;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->secretKey = getenv('AUDIT_SECRET_KEY') ?: 'default-audit-key-change-in-production';
    }
    
    /**
     * Create immutable audit entry with hash chain
     */
    public function createAuditEntry($tableName, $recordId, $action, $oldValues = null, $newValues = null, $userId = null)
    {
        $auditId = $this->generateAuditId();
        $timestamp = date('Y-m-d H:i:s');
        
        // Get previous audit entry for hash chaining
        $previousEntry = $this->getLastAuditEntry();
        $previousChecksum = $previousEntry['checksum'] ?? '';
        
        // Create audit data
        $auditData = [
            'id' => $auditId,
            'table_name' => $tableName,
            'record_id' => (string)$recordId,
            'action' => $action,
            'old_values' => $oldValues ? json_encode($oldValues, JSON_UNESCAPED_UNICODE) : null,
            'new_values' => $newValues ? json_encode($newValues, JSON_UNESCAPED_UNICODE) : null,
            'user_id' => $userId ?: 1,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'session_id' => session_id() ?: 'unknown',
            'timestamp' => $timestamp,
            'previous_checksum' => $previousChecksum
        ];
        
        // Generate checksum for this entry
        $checksum = $this->generateChecksum($auditData);
        $auditData['checksum'] = $checksum;
        
        // Insert audit entry (append-only)
        try {
            $this->db->table('audit_log')->insert($auditData);
            return $auditId;
        } catch (\Exception $e) {
            // Log error but don't fail the main operation
            error_log("Audit logging failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Verify audit trail integrity
     */
    public function verifyAuditIntegrity($startDate = null, $endDate = null)
    {
        $query = "SELECT * FROM audit_log";
        $params = [];
        
        if ($startDate && $endDate) {
            $query .= " WHERE timestamp BETWEEN ? AND ?";
            $params = [$startDate, $endDate];
        }
        
        $query .= " ORDER BY timestamp ASC";
        
        $auditEntries = $this->db->query($query, $params)->getResultArray();
        
        $results = [
            'total_entries' => count($auditEntries),
            'verified_entries' => 0,
            'corrupted_entries' => 0,
            'chain_breaks' => 0,
            'corrupted_ids' => []
        ];
        
        $previousChecksum = '';
        
        foreach ($auditEntries as $entry) {
            // Verify individual entry checksum
            $entryData = $entry;
            $storedChecksum = $entryData['checksum'];
            unset($entryData['checksum']);
            
            $calculatedChecksum = $this->generateChecksum($entryData);
            
            if ($storedChecksum === $calculatedChecksum) {
                $results['verified_entries']++;
            } else {
                $results['corrupted_entries']++;
                $results['corrupted_ids'][] = $entry['id'];
            }
            
            // Verify hash chain
            if ($previousChecksum !== '' && $entry['previous_checksum'] !== $previousChecksum) {
                $results['chain_breaks']++;
            }
            
            $previousChecksum = $storedChecksum;
        }
        
        return $results;
    }
    
    /**
     * Export audit trail for compliance
     */
    public function exportAuditTrail($startDate, $endDate, $format = 'json')
    {
        $auditEntries = $this->db->query(
            "SELECT al.*, u.username, u.full_name 
             FROM audit_log al
             LEFT JOIN users u ON al.user_id = u.id
             WHERE al.timestamp BETWEEN ? AND ?
             ORDER BY al.timestamp ASC",
            [$startDate, $endDate]
        )->getResultArray();
        
        // Add integrity verification
        $integrityCheck = $this->verifyAuditIntegrity($startDate, $endDate);
        
        $exportData = [
            'export_metadata' => [
                'generated_at' => date('Y-m-d H:i:s'),
                'period_start' => $startDate,
                'period_end' => $endDate,
                'total_entries' => count($auditEntries),
                'integrity_status' => $integrityCheck['corrupted_entries'] === 0 ? 'VERIFIED' : 'CORRUPTED',
                'integrity_details' => $integrityCheck
            ],
            'audit_entries' => $auditEntries
        ];
        
        if ($format === 'csv') {
            return $this->convertToCSV($exportData['audit_entries']);
        }
        
        return json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
    
    /**
     * Detect tampering attempts
     */
    public function detectTampering()
    {
        $tamperingIndicators = [];
        
        // Check for gaps in timestamp sequence
        $gaps = $this->db->query("
            SELECT 
                id,
                timestamp,
                LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp,
                TIMESTAMPDIFF(SECOND, LAG(timestamp) OVER (ORDER BY timestamp), timestamp) as gap_seconds
            FROM audit_log
            HAVING gap_seconds > 3600
        ")->getResultArray();
        
        if (!empty($gaps)) {
            $tamperingIndicators[] = [
                'type' => 'timestamp_gaps',
                'description' => 'Suspicious gaps in audit timeline',
                'entries' => $gaps
            ];
        }
        
        // Check for duplicate checksums
        $duplicates = $this->db->query("
            SELECT checksum, COUNT(*) as count
            FROM audit_log
            GROUP BY checksum
            HAVING count > 1
        ")->getResultArray();
        
        if (!empty($duplicates)) {
            $tamperingIndicators[] = [
                'type' => 'duplicate_checksums',
                'description' => 'Duplicate checksums detected',
                'entries' => $duplicates
            ];
        }
        
        // Check for broken hash chains
        $chainBreaks = $this->db->query("
            SELECT 
                al1.id,
                al1.checksum,
                al1.previous_checksum,
                al2.checksum as expected_previous
            FROM audit_log al1
            LEFT JOIN audit_log al2 ON al2.timestamp < al1.timestamp
            WHERE al1.previous_checksum != COALESCE(al2.checksum, '')
            AND al2.id IS NOT NULL
        ")->getResultArray();
        
        if (!empty($chainBreaks)) {
            $tamperingIndicators[] = [
                'type' => 'broken_hash_chain',
                'description' => 'Hash chain integrity compromised',
                'entries' => $chainBreaks
            ];
        }
        
        return $tamperingIndicators;
    }
    
    /**
     * Track specific audit categories
     */
    public function trackCostEdits($workOrderId = null, $startDate = null, $endDate = null)
    {
        $query = "
            SELECT al.*, u.username, u.full_name
            FROM audit_log al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.table_name = 'work_orders'
            AND (al.old_values LIKE '%cost%' OR al.new_values LIKE '%cost%')
        ";
        
        $params = [];
        
        if ($workOrderId) {
            $query .= " AND al.record_id = ?";
            $params[] = $workOrderId;
        }
        
        if ($startDate && $endDate) {
            $query .= " AND al.timestamp BETWEEN ? AND ?";
            $params[] = $startDate;
            $params[] = $endDate;
        }
        
        $query .= " ORDER BY al.timestamp DESC";
        
        return $this->db->query($query, $params)->getResultArray();
    }
    
    /**
     * Track override activities
     */
    public function trackOverrides($startDate = null, $endDate = null)
    {
        $query = "
            SELECT al.*, u.username, u.full_name
            FROM audit_log al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE (
                al.new_values LIKE '%override%' OR
                al.action = 'override' OR
                al.table_name = 'permission_overrides'
            )
        ";
        
        $params = [];
        
        if ($startDate && $endDate) {
            $query .= " AND al.timestamp BETWEEN ? AND ?";
            $params[] = $startDate;
            $params[] = $endDate;
        }
        
        $query .= " ORDER BY al.timestamp DESC";
        
        return $this->db->query($query, $params)->getResultArray();
    }
    
    /**
     * Generate unique audit ID
     */
    private function generateAuditId()
    {
        return uniqid('audit_', true);
    }
    
    /**
     * Generate secure checksum for audit entry
     */
    private function generateChecksum($auditData)
    {
        $dataString = implode('|', [
            $auditData['id'],
            $auditData['table_name'],
            $auditData['record_id'],
            $auditData['action'],
            $auditData['old_values'] ?? '',
            $auditData['new_values'] ?? '',
            $auditData['user_id'],
            $auditData['timestamp'],
            $auditData['previous_checksum'] ?? '',
            $this->secretKey
        ]);
        
        return hash('sha256', $dataString);
    }
    
    /**
     * Get last audit entry for hash chaining
     */
    private function getLastAuditEntry()
    {
        return $this->db->query(
            "SELECT checksum FROM audit_log ORDER BY timestamp DESC LIMIT 1"
        )->getRowArray() ?: [];
    }
    
    /**
     * Convert audit data to CSV format
     */
    private function convertToCSV($auditEntries)
    {
        if (empty($auditEntries)) {
            return '';
        }
        
        $csv = '';
        $headers = array_keys($auditEntries[0]);
        $csv .= implode(',', $headers) . "\n";
        
        foreach ($auditEntries as $entry) {
            $csv .= implode(',', array_map(function($value) {
                return '"' . str_replace('"', '""', $value ?? '') . '"';
            }, $entry)) . "\n";
        }
        
        return $csv;
    }
}