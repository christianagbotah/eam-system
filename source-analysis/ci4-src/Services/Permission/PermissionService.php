<?php

namespace App\Services\Permission;

use CodeIgniter\Database\ConnectionInterface;

class PermissionService
{
    protected $db;
    protected $cache;
    protected $cachePrefix = 'perm_';
    protected $cacheTTL = 3600;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->cache = \Config\Services::cache();
    }

    public function hasPermission(int $userId, string $permission): bool
    {
        $cacheKey = $this->cachePrefix . "user_{$userId}_perm_{$permission}";
        $cached = $this->cache->get($cacheKey);
        
        if ($cached !== null) {
            return (bool) $cached;
        }

        $permissions = $this->getUserPermissions($userId);
        
        if (in_array('*', $permissions)) {
            $this->cache->save($cacheKey, true, $this->cacheTTL);
            return true;
        }

        $hasPermission = in_array($permission, $permissions);
        
        if (!$hasPermission) {
            $module = explode('.', $permission)[0];
            $hasPermission = in_array($module . '.*', $permissions);
        }

        $this->cache->save($cacheKey, $hasPermission, $this->cacheTTL);
        
        return $hasPermission;
    }

    public function hasAnyPermission(int $userId, array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($userId, $permission)) {
                return true;
            }
        }
        return false;
    }

    public function hasAllPermissions(int $userId, array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (!$this->hasPermission($userId, $permission)) {
                return false;
            }
        }
        return true;
    }

    public function getUserPermissions(int $userId): array
    {
        $cacheKey = $this->cachePrefix . "user_{$userId}_all";
        $cached = $this->cache->get($cacheKey);
        
        if ($cached !== null) {
            return $cached;
        }

        $query = "
            SELECT DISTINCT 
                CONCAT(p.module, '.', p.action) as permission
            FROM user_roles ur
            JOIN role_permissions rp ON ur.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = ?
            AND ur.deleted_at IS NULL
        ";

        $result = $this->db->query($query, [$userId]);
        $permissions = array_column($result->getResultArray(), 'permission');

        $adminQuery = "
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = ?
            AND r.name = 'admin'
            AND ur.deleted_at IS NULL
            LIMIT 1
        ";
        
        $adminResult = $this->db->query($adminQuery, [$userId]);
        if ($adminResult->getNumRows() > 0) {
            $permissions[] = '*';
        }

        $this->cache->save($cacheKey, $permissions, $this->cacheTTL);

        return $permissions;
    }

    public function getUserRoles(int $userId): array
    {
        $query = "
            SELECT r.*
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = ?
            AND ur.deleted_at IS NULL
        ";

        $result = $this->db->query($query, [$userId]);
        return $result->getResultArray();
    }

    public function assignRole(int $userId, int $roleId): bool
    {
        $existing = $this->db->table('user_roles')
            ->where('user_id', $userId)
            ->where('role_id', $roleId)
            ->where('deleted_at', null)
            ->get()
            ->getRow();

        if ($existing) {
            return true;
        }

        $data = [
            'user_id' => $userId,
            'role_id' => $roleId,
            'created_at' => date('Y-m-d H:i:s')
        ];

        $result = $this->db->table('user_roles')->insert($data);
        
        if ($result) {
            $this->clearUserCache($userId);
        }

        return $result;
    }

    public function removeRole(int $userId, int $roleId): bool
    {
        $result = $this->db->table('user_roles')
            ->where('user_id', $userId)
            ->where('role_id', $roleId)
            ->update(['deleted_at' => date('Y-m-d H:i:s')]);

        if ($result) {
            $this->clearUserCache($userId);
        }

        return $result;
    }

    public function getRolePermissions(int $roleId): array
    {
        $query = "
            SELECT p.*
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = ?
        ";

        $result = $this->db->query($query, [$roleId]);
        return $result->getResultArray();
    }

    public function syncRolePermissions(int $roleId, array $permissionIds): bool
    {
        $this->db->transStart();

        $this->db->table('role_permissions')
            ->where('role_id', $roleId)
            ->delete();

        if (!empty($permissionIds)) {
            $data = [];
            foreach ($permissionIds as $permissionId) {
                $data[] = [
                    'role_id' => $roleId,
                    'permission_id' => $permissionId,
                    'created_at' => date('Y-m-d H:i:s')
                ];
            }
            $this->db->table('role_permissions')->insertBatch($data);
        }

        $this->db->transComplete();

        if ($this->db->transStatus()) {
            $this->clearRoleCache($roleId);
            return true;
        }

        return false;
    }

    public function clearUserCache(int $userId): void
    {
        $this->cache->delete($this->cachePrefix . "user_{$userId}_all");
    }

    public function clearRoleCache(int $roleId): void
    {
        $users = $this->db->table('user_roles')
            ->where('role_id', $roleId)
            ->where('deleted_at', null)
            ->get()
            ->getResultArray();

        foreach ($users as $user) {
            $this->clearUserCache($user['user_id']);
        }
    }
}
