<?php

namespace App\Services;

use App\Repositories\UserRepository;
use App\Libraries\JWT\JWTHandler;

class AuthService
{
    protected $userRepository;
    protected $jwtHandler;

    public function __construct()
    {
        $this->userRepository = new UserRepository();
        $this->jwtHandler = new JWTHandler();
    }

    public function login(array $credentials): array
    {
        $user = $this->userRepository->findByUsername($credentials['username']);

        if (!$user || !password_verify($credentials['password'], $user['password'])) {
            return [
                'success' => false,
                'message' => 'Invalid credentials'
            ];
        }

        if ($user['status'] !== 'active') {
            return [
                'success' => false,
                'message' => 'Account is not active'
            ];
        }

        $payload = [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role']
        ];

        $tokens = $this->jwtHandler->generateTokens($payload);

        $this->userRepository->updateLastLogin($user['id']);

        return [
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'full_name' => ($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''),
                    'role' => $user['role']
                ],
                'tokens' => [
                    'access_token' => $tokens['access_token'],
                    'refresh_token' => $tokens['refresh_token']
                ],
                'token_type' => 'Bearer'
            ]
        ];
    }

    public function register(array $data): array
    {
        $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        $data['status'] = 'active';
        $data['role'] = $data['role'] ?? 'operator';

        $userId = $this->userRepository->create($data);

        if (!$userId) {
            return [
                'success' => false,
                'message' => 'Failed to create user'
            ];
        }

        $user = $this->userRepository->findById($userId);

        return [
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'role' => $user['role']
                ]
            ]
        ];
    }

    public function refreshToken(string $refreshToken): array
    {
        $decoded = $this->jwtHandler->validateToken($refreshToken);

        if (!$decoded || !isset($decoded->type) || $decoded->type !== 'refresh') {
            return [
                'success' => false,
                'message' => 'Invalid refresh token'
            ];
        }

        $payload = (array)$decoded->data;
        $tokens = $this->jwtHandler->generateTokens($payload);

        return [
            'success' => true,
            'data' => [
                'tokens' => [
                    'access_token' => $tokens['access_token']
                ],
                'token_type' => 'Bearer'
            ]
        ];
    }

    public function getUserProfile(int $userId): array
    {
        return $this->userRepository->findById($userId);
    }
}
