<?php

namespace App\Traits;

trait PermissionTrait
{
    /**
     * Check if user has permission for module.action
     */
    protected function checkPermission(string $module, string $action): bool
    {
        $userData = $this->getUserData();
        $userRole = $userData['role'] ?? 'technician';
        $userId = $userData['user_id'] ?? $userData['id'] ?? null;

        if (!$userId) {
            return false;
        }

        // Super admin bypass
        if ($userRole === 'admin') {
            return true;
        }

        $db = \Config\Database::connect();

        // Check role-based permissions
        $hasPermission = $db->table('user_roles ur')
            ->join('role_permissions rp', 'ur.role_id = rp.role_id')
            ->join('permissions p', 'rp.permission_id = p.id')
            ->where('ur.user_id', $userId)
            ->where('p.module', $module)
            ->where('p.action', $action)
            ->countAllResults() > 0;

        // Log permission check for audit
        if (!$hasPermission) {
            log_message('warning', sprintf(
                'Permission denied: User %s (%s) attempted %s.%s',
                $userId,
                $userRole,
                $module,
                $action
            ));
        }

        return $hasPermission;
    }

    /**
     * Check multiple permissions (user must have ALL)
     */
    protected function checkPermissions(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (is_array($permission)) {
                list($module, $action) = $permission;
            } else {
                // Assume format "module.action"
                list($module, $action) = explode('.', $permission);
            }

            if (!$this->checkPermission($module, $action)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if user has any of the permissions (OR logic)
     */
    protected function checkAnyPermission(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (is_array($permission)) {
                list($module, $action) = $permission;
            } else {
                list($module, $action) = explode('.', $permission);
            }

            if ($this->checkPermission($module, $action)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get user data from JWT/session
     */
    protected function getUserData(): array
    {
        // Get from globals (set by JWT filter)
        if (isset($GLOBALS['jwt_user_data'])) {
            $data = $GLOBALS['jwt_user_data'];
            return is_array($data) ? $data : (array)$data;
        }

        // Fallback to session
        $sessionData = session()->get('user_data');
        if ($sessionData) {
            return $sessionData;
        }

        return [];
    }

    /**
     * Get current user ID
     */
    protected function getCurrentUserId(): ?int
    {
        $userData = $this->getUserData();
        return $userData['user_id'] ?? $userData['id'] ?? null;
    }

    /**
     * Get current user role
     */
    protected function getCurrentUserRole(): string
    {
        $userData = $this->getUserData();
        return $userData['role'] ?? 'technician';
    }
}