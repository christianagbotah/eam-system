<?php

namespace App\Libraries;

class SecurityAuditLogger
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    /**
     * Log security event
     */
    public function log(string $action, array $data = [], string $severity = 'low'): void
    {
        $request = \Config\Services::request();
        $userData = $request->getAttribute('user_data') ?? $GLOBALS['jwt_user_data'] ?? null;
        
        $this->db->table('audit_logs_enhanced')->insert([
            'user_id' => $userData['user_id'] ?? $userData['id'] ?? null,
            'plant_id' => $request->getHeaderLine('X-Plant-ID') ?: null,
            'action' => $action,
            'entity_type' => $data['entity_type'] ?? 'system',
            'entity_id' => $data['entity_id'] ?? null,
            'old_values' => isset($data['old_values']) ? json_encode($data['old_values']) : null,
            'new_values' => isset($data['new_values']) ? json_encode($data['new_values']) : null,
            'ip_address' => $request->getIPAddress(),
            'user_agent' => $request->getUserAgent()->getAgentString(),
            'request_id' => $data['request_id'] ?? bin2hex(random_bytes(8)),
            'severity' => $severity,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * Log failed login attempt
     */
    public function logFailedLogin(string $username): void
    {
        $request = \Config\Services::request();
        
        $this->db->table('failed_login_attempts')->insert([
            'username' => $username,
            'ip_address' => $request->getIPAddress(),
            'user_agent' => $request->getUserAgent()->getAgentString(),
            'attempted_at' => date('Y-m-d H:i:s')
        ]);
        
        $this->log('failed_login', [
            'entity_type' => 'auth',
            'username' => $username
        ], 'medium');
    }
    
    /**
     * Check if account should be locked
     */
    public function shouldLockAccount(string $username): bool
    {
        $maxAttempts = (int)(getenv('SECURITY_MAX_LOGIN_ATTEMPTS') ?: 5);
        $lockoutDuration = (int)(getenv('SECURITY_LOGIN_LOCKOUT_DURATION') ?: 900);
        
        $since = date('Y-m-d H:i:s', time() - $lockoutDuration);
        
        $attempts = $this->db->table('failed_login_attempts')
            ->where('username', $username)
            ->where('attempted_at >', $since)
            ->countAllResults();
        
        return $attempts >= $maxAttempts;
    }
    
    /**
     * Clear failed login attempts
     */
    public function clearFailedAttempts(string $username): void
    {
        $this->db->table('failed_login_attempts')
            ->where('username', $username)
            ->delete();
    }
}
