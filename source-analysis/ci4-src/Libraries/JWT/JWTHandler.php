<?php

namespace App\Libraries\JWT;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class JWTHandler
{
    private $secretKey;
    private $algorithm = 'HS256';
    private $tokenExpiry = 86400; // 24 hours (increased from 8 hours)
    private $refreshExpiry = 604800; // 7 days

    public function __construct()
    {
        $this->secretKey = getenv('JWT_SECRET_KEY') ?: 'your-secret-key-change-in-production';
    }

    public function generateTokens(array $payload): array
    {
        $issuedAt = time();
        $expiresAt = $issuedAt + $this->tokenExpiry;
        
        $accessToken = [
            'iat' => $issuedAt,
            'exp' => $expiresAt,
            'data' => $payload
        ];
        
        $refreshToken = [
            'iat' => $issuedAt,
            'exp' => $issuedAt + $this->refreshExpiry,
            'data' => $payload,
            'type' => 'refresh'
        ];

        return [
            'access_token' => JWT::encode($accessToken, $this->secretKey, $this->algorithm),
            'refresh_token' => JWT::encode($refreshToken, $this->secretKey, $this->algorithm),
            'expires_in' => $this->tokenExpiry
        ];
    }

    public function validateToken(string $token): ?object
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secretKey, $this->algorithm));
            
            // Check if token is expired
            if (isset($decoded->exp) && $decoded->exp < time()) {
                log_message('error', 'Token expired at: ' . date('Y-m-d H:i:s', $decoded->exp));
                return null;
            }
            
            return $decoded;
        } catch (\Firebase\JWT\ExpiredException $e) {
            log_message('error', 'Token expired: ' . $e->getMessage());
            return null;
        } catch (\Firebase\JWT\SignatureInvalidException $e) {
            log_message('error', 'Token signature invalid: ' . $e->getMessage());
            return null;
        } catch (Exception $e) {
            log_message('error', 'Token validation failed: ' . $e->getMessage());
            return null;
        }
    }

    public function getPayload(string $token): ?array
    {
        $decoded = $this->validateToken($token);
        return $decoded ? (array)$decoded->data : null;
    }
}
