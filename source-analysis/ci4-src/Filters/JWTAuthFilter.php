<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use App\Libraries\JWT\SecureJWTHandler;

class JWTAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $authHeader = $request->getHeaderLine('Authorization');
        
        if (!$authHeader) {
            $authHeader = $request->getHeader('Authorization');
            if ($authHeader && is_array($authHeader)) {
                $authHeader = $authHeader[0] ?? '';
            }
        }
        
        if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        
        if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            log_message('error', 'JWT Auth: No authorization header found');
            return service('response')->setJSON([
                'success' => false,
                'message' => 'Authorization token required. Please log in again.',
                'code' => 401,
                'error_type' => 'missing_token'
            ])->setStatusCode(401);
        }

        $token = $matches[1];
        $jwtHandler = new SecureJWTHandler();
        
        // Check if token is blacklisted
        if ($jwtHandler->isTokenBlacklisted($token)) {
            log_message('error', 'JWT Auth: Token is blacklisted');
            return service('response')->setJSON([
                'success' => false,
                'message' => 'Token has been revoked. Please log in again.',
                'code' => 401,
                'error_type' => 'blacklisted_token'
            ])->setStatusCode(401);
        }
        
        $decoded = $jwtHandler->validateToken($token);
        
        if (!$decoded) {
            log_message('error', 'JWT Auth: Token validation failed');
            
            return service('response')->setJSON([
                'success' => false,
                'message' => 'Your session has expired. Please log in again.',
                'code' => 401,
                'error_type' => 'invalid_token'
            ])->setStatusCode(401);
        }

        $userData = $decoded->data;
        $userId = $userData->user_id ?? $userData->id ?? null;
        
        // Store in GLOBALS for backward compatibility
        $GLOBALS['jwt_user_id'] = $userId;
        $GLOBALS['user_id'] = $userId;
        $GLOBALS['jwt_user_data'] = $userData;
        
        // Store in session
        session()->set('user_id', $userId);
        session()->set('user_data', (array)$userData);
        
        log_message('debug', 'JWT Auth: User authenticated - ID: ' . $userId);
        
        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // No action needed
    }

    public static function getUserData()
    {
        return $GLOBALS['jwt_user_data'] ?? (object)[];
    }
}
