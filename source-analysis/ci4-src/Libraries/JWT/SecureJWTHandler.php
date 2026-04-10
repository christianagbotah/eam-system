<?php

namespace App\Libraries\JWT;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class SecureJWTHandler
{
    private $secretKey;
    private $algorithm = 'HS256';
    private $tokenExpiry = 3600; // 1 hour
    private $refreshExpiry = 604800; // 7 days
    
    public function __construct()
    {
        $this->secretKey = env('JWT_SECRET_KEY', getenv('JWT_SECRET_KEY'));
        
        if (!$this->secretKey || strlen($this->secretKey) < 32) {
            throw new Exception('JWT_SECRET_KEY must be at least 32 characters');
        }
    }
    
    public function generateToken($userData, $isRefresh = false)
    {
        $issuedAt = time();
        $expiry = $isRefresh ? $issuedAt + $this->refreshExpiry : $issuedAt + $this->tokenExpiry;
        
        $payload = [
            'iat' => $issuedAt,
            'exp' => $expiry,
            'nbf' => $issuedAt,
            'iss' => base_url(),
            'aud' => base_url(),
            'jti' => bin2hex(random_bytes(16)), // Unique token ID
            'type' => $isRefresh ? 'refresh' : 'access',
            'data' => $userData
        ];
        
        return JWT::encode($payload, $this->secretKey, $this->algorithm);
    }
    
    public function generateTokens($userData)
    {
        return [
            'access_token' => $this->generateToken($userData, false),
            'refresh_token' => $this->generateToken($userData, true),
            'expires_in' => $this->tokenExpiry
        ];
    }
    
    public function validateToken($token)
    {
        try {
            // Check if token is blacklisted
            if ($this->isBlacklisted($token)) {
                return false;
            }
            
            $decoded = JWT::decode($token, new Key($this->secretKey, $this->algorithm));
            
            // Verify token type
            if (!isset($decoded->type) || $decoded->type !== 'access') {
                return false;
            }
            
            return $decoded;
        } catch (Exception $e) {
            log_message('error', 'JWT Validation Error: ' . $e->getMessage());
            return false;
        }
    }
    
    public function blacklistToken($token, $reason = null)
    {
        $db = \Config\Database::connect();
        $tokenHash = hash('sha256', $token);
        
        try {
            $decoded = JWT::decode($token, new Key($this->secretKey, $this->algorithm));
            
            $db->table('jwt_blacklist')->insert([
                'token_hash' => $tokenHash,
                'user_id' => $decoded->data->user_id ?? null,
                'expires_at' => date('Y-m-d H:i:s', $decoded->exp),
                'reason' => $reason,
                'created_at' => date('Y-m-d H:i:s')
            ]);
            
            return true;
        } catch (Exception $e) {
            log_message('error', 'Token Blacklist Error: ' . $e->getMessage());
            return false;
        }
    }
    
    public function isTokenBlacklisted($token)
    {
        return $this->isBlacklisted($token);
    }
    
    private function isBlacklisted($token)
    {
        $db = \Config\Database::connect();
        $tokenHash = hash('sha256', $token);
        
        $result = $db->table('jwt_blacklist')
            ->where('token_hash', $tokenHash)
            ->where('expires_at >', date('Y-m-d H:i:s'))
            ->get()
            ->getRow();
        
        return $result !== null;
    }
    
    public function cleanupExpiredTokens()
    {
        $db = \Config\Database::connect();
        $db->table('jwt_blacklist')
            ->where('expires_at <', date('Y-m-d H:i:s'))
            ->delete();
    }
}
