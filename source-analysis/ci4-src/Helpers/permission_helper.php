<?php

use App\Services\Permission\PermissionService;

if (!function_exists('can')) {
    function can(string $permission, ?int $userId = null): bool
    {
        if ($userId === null) {
            $userId = session()->get('user_id');
        }

        if (!$userId) {
            return false;
        }

        $permissionService = new PermissionService();
        return $permissionService->hasPermission($userId, $permission);
    }
}

if (!function_exists('canAny')) {
    function canAny(array $permissions, ?int $userId = null): bool
    {
        if ($userId === null) {
            $userId = session()->get('user_id');
        }

        if (!$userId) {
            return false;
        }

        $permissionService = new PermissionService();
        return $permissionService->hasAnyPermission($userId, $permissions);
    }
}

if (!function_exists('canAll')) {
    function canAll(array $permissions, ?int $userId = null): bool
    {
        if ($userId === null) {
            $userId = session()->get('user_id');
        }

        if (!$userId) {
            return false;
        }

        $permissionService = new PermissionService();
        return $permissionService->hasAllPermissions($userId, $permissions);
    }
}

if (!function_exists('userCan')) {
    function userCan(int $userId, string $permission): bool
    {
        $permissionService = new PermissionService();
        return $permissionService->hasPermission($userId, $permission);
    }
}

if (!function_exists('getUserPermissions')) {
    function getUserPermissions(?int $userId = null): array
    {
        if ($userId === null) {
            $userId = session()->get('user_id');
        }

        if (!$userId) {
            return [];
        }

        $permissionService = new PermissionService();
        return $permissionService->getUserPermissions($userId);
    }
}

if (!function_exists('getUserRoles')) {
    function getUserRoles(?int $userId = null): array
    {
        if ($userId === null) {
            $userId = session()->get('user_id');
        }

        if (!$userId) {
            return [];
        }

        $permissionService = new PermissionService();
        return $permissionService->getUserRoles($userId);
    }
}

if (!function_exists('hasRole')) {
    function hasRole(string $roleName, ?int $userId = null): bool
    {
        $roles = getUserRoles($userId);
        
        foreach ($roles as $role) {
            if ($role['name'] === $roleName) {
                return true;
            }
        }

        return false;
    }
}

if (!function_exists('isAdmin')) {
    function isAdmin(?int $userId = null): bool
    {
        return hasRole('admin', $userId);
    }
}

if (!function_exists('authorize')) {
    function authorize(string $permission, ?int $userId = null): void
    {
        if (!can($permission, $userId)) {
            throw new \App\Exceptions\UnauthorizedException(
                "You don't have permission to: {$permission}"
            );
        }
    }
}

if (!function_exists('authorizeAny')) {
    function authorizeAny(array $permissions, ?int $userId = null): void
    {
        if (!canAny($permissions, $userId)) {
            throw new \App\Exceptions\UnauthorizedException(
                "You don't have any of the required permissions"
            );
        }
    }
}

if (!function_exists('authorizeAll')) {
    function authorizeAll(array $permissions, ?int $userId = null): void
    {
        if (!canAll($permissions, $userId)) {
            throw new \App\Exceptions\UnauthorizedException(
                "You don't have all required permissions"
            );
        }
    }
}
