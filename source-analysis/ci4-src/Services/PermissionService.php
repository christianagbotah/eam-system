<?php

namespace App\Services;

use App\Config\Rbac;
use App\Models\UserModel;

class PermissionService
{
    protected $rbacConfig;
    protected $userModel;

    public function __construct()
    {
        $this->rbacConfig = new Rbac();
        $this->userModel = new UserModel();
    }

    public function userHasPermission(int $userId, string $permission): bool
    {
        $user = $this->userModel->find($userId);
        
        if (!$user) {
            return false;
        }

        $userRole = $user['role'] ?? 'operator';
        $rolePermissions = $this->rbacConfig->getRolePermissions($userRole);

        return in_array($permission, $rolePermissions);
    }

    public function getUserPermissions(int $userId): array
    {
        $user = $this->userModel->find($userId);
        
        if (!$user) {
            return [];
        }

        $userRole = $user['role'] ?? 'operator';
        return $this->rbacConfig->getRolePermissions($userRole);
    }

    public function getRolePermissions(string $role): array
    {
        return $this->rbacConfig->getRolePermissions($role);
    }

    public function getAllRoles(): array
    {
        return $this->rbacConfig->roles;
    }

    public function getAllPermissions(): array
    {
        return $this->rbacConfig->permissions;
    }

    public function validatePermissions(array $permissions): bool
    {
        $validPermissions = $this->rbacConfig->getAllPermissions();
        
        foreach ($permissions as $permission) {
            if (!in_array($permission, $validPermissions)) {
                return false;
            }
        }

        return true;
    }
}