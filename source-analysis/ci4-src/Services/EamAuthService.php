<?php

namespace App\Services;

use App\Repositories\EamUserRepository;
use App\Libraries\JWT\SecureJWTHandler;

class EamAuthService
{
    protected $userRepo;
    protected $jwt;

    public function __construct()
    {
        $this->userRepo = new EamUserRepository();
        $this->jwt = new SecureJWTHandler();
    }

    public function login($data)
    {
        $user = $this->userRepo->findByUsername($data['username'] ?? '');
        
        if (!$user || !password_verify($data['password'] ?? '', $user['password'])) {
            return ['status' => 'error', 'message' => 'Invalid credentials'];
        }

        // Get user's plants
        $db = \Config\Database::connect();
        $userPlants = $db->table('user_plants')
            ->select('plant_id, is_primary')
            ->where('user_id', $user['id'])
            ->get()
            ->getResultArray();
        
        $plantIds = array_column($userPlants, 'plant_id');
        $primaryPlant = null;
        foreach ($userPlants as $up) {
            if ($up['is_primary']) {
                $primaryPlant = $up['plant_id'];
                break;
            }
        }
        
        // If no primary plant, use first plant
        if (!$primaryPlant && !empty($plantIds)) {
            $primaryPlant = $plantIds[0];
        }

        // Get user's role and permissions
        $userRoles = $db->table('user_roles')
            ->where('user_id', $user['id'])
            ->get()
            ->getResultArray();
        
        $permissions = [];
        if (!empty($userRoles)) {
            $roleIds = array_column($userRoles, 'role_id');
            
            // Get permissions for these roles
            $rolePermissions = $db->table('role_permissions rp')
                ->select('p.permission_slug')
                ->join('permissions p', 'p.id = rp.permission_id')
                ->whereIn('rp.role_id', $roleIds)
                ->get()
                ->getResultArray();
            
            $permissions = array_unique(array_column($rolePermissions, 'permission_slug'));
        }
        
        // If admin role, add all permissions
        if ($user['role'] === 'admin') {
            $allPermissions = $db->table('permissions')
                ->select('permission_slug')
                ->get()
                ->getResultArray();
            $permissions = array_unique(array_merge($permissions, array_column($allPermissions, 'permission_slug')));
        }

        $payload = [
            'sub' => $user['id'],
            'user_id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'] ?? 'technician',
            'department_id' => $user['department_id'] ?? null,
            'plant_id' => $primaryPlant,
            'plant_ids' => $plantIds
        ];
        
        $tokens = $this->jwt->generateTokens($payload);
        
        log_message('debug', 'Generated tokens: ' . json_encode($tokens));
        log_message('debug', 'Access token: ' . $tokens['access_token']);
        
        return [
            'token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
            'user' => [
                'id' => $user['id'], 
                'username' => $user['username'], 
                'email' => $user['email'] ?? '',
                'full_name' => $user['full_name'] ?? $user['username'],
                'role' => $user['role'] ?? 'technician',
                'department_id' => $user['department_id'] ?? null,
                'plant_id' => $primaryPlant,
                'plant_ids' => $plantIds,
                'is_vendor_admin' => $user['is_vendor_admin'] ?? 0,
                'permissions' => $permissions
            ],
            'expires_in' => 3600
        ];
    }

    public function logout($token)
    {
        // Extract token from Bearer header
        if (preg_match('/Bearer\s+(.*)$/i', $token, $matches)) {
            $token = $matches[1];
        }
        
        // Blacklist the token
        if ($token) {
            $this->jwt->blacklistToken($token, 'User logout');
        }
        
        return ['status' => 'success', 'message' => 'Logged out successfully'];
    }

    public function refresh($refreshToken)
    {
        $payload = $this->jwt->validateToken($refreshToken);
        
        if (!$payload || !isset($payload->type) || $payload->type !== 'refresh') {
            return ['status' => 'error', 'message' => 'Invalid refresh token'];
        }

        $data = (array)$payload->data;
        $refreshPayload = [
            'sub' => $data['user_id'] ?? $data['sub'] ?? null,
            'user_id' => $data['user_id'] ?? $data['sub'] ?? null,
            'username' => $data['username'] ?? '',
            'role' => $data['role'] ?? 'technician',
            'department_id' => $data['department_id'] ?? null,
            'plant_id' => $data['plant_id'] ?? null,
            'plant_ids' => $data['plant_ids'] ?? []
        ];
        
        $tokens = $this->jwt->generateTokens($refreshPayload);
        
        return [
            'status' => 'success',
            'data' => [
                'access_token' => $tokens['access_token'],
                'refresh_token' => $tokens['refresh_token'],
                'expires_in' => $tokens['expires_in']
            ]
        ];
    }
}
