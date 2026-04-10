<?php

namespace App\Services\Permission;

class RoleService
{
    protected $db;
    protected $permissionService;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->permissionService = new PermissionService();
    }

    public function createRole(array $data): ?int
    {
        $data['created_at'] = date('Y-m-d H:i:s');
        
        if ($this->db->table('roles')->insert($data)) {
            return $this->db->insertID();
        }

        return null;
    }

    public function updateRole(int $roleId, array $data): bool
    {
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        $result = $this->db->table('roles')
            ->where('id', $roleId)
            ->update($data);

        if ($result) {
            $this->permissionService->clearRoleCache($roleId);
        }

        return $result;
    }

    public function deleteRole(int $roleId): bool
    {
        $role = $this->getRole($roleId);
        
        if ($role && isset($role['is_system_role']) && $role['is_system_role']) {
            return false;
        }

        $result = $this->db->table('roles')
            ->where('id', $roleId)
            ->update(['deleted_at' => date('Y-m-d H:i:s')]);

        if ($result) {
            $this->permissionService->clearRoleCache($roleId);
        }

        return $result;
    }

    public function getRole(int $roleId): ?array
    {
        $result = $this->db->table('roles')
            ->where('id', $roleId)
            ->where('deleted_at', null)
            ->get()
            ->getRowArray();

        return $result ?: null;
    }

    public function getAllRoles(): array
    {
        return $this->db->table('roles')
            ->where('deleted_at', null)
            ->orderBy('name', 'ASC')
            ->get()
            ->getResultArray();
    }

    public function getRoleByName(string $name): ?array
    {
        $result = $this->db->table('roles')
            ->where('name', $name)
            ->where('deleted_at', null)
            ->get()
            ->getRowArray();

        return $result ?: null;
    }

    public function roleExists(string $name): bool
    {
        $result = $this->db->table('roles')
            ->where('name', $name)
            ->where('deleted_at', null)
            ->get()
            ->getRow();

        return $result !== null;
    }

    public function getUsersWithRole(int $roleId): array
    {
        $query = "
            SELECT u.*
            FROM user_roles ur
            JOIN users u ON ur.user_id = u.user_id
            WHERE ur.role_id = ?
            AND ur.deleted_at IS NULL
        ";

        $result = $this->db->query($query, [$roleId]);
        return $result->getResultArray();
    }

    public function cloneRole(int $sourceRoleId, string $newRoleName, string $newDescription = ''): ?int
    {
        $sourceRole = $this->getRole($sourceRoleId);
        
        if (!$sourceRole) {
            return null;
        }

        $this->db->transStart();

        $newRoleData = [
            'name' => $newRoleName,
            'description' => $newDescription ?: $sourceRole['description'],
            'is_system_role' => 0
        ];

        $newRoleId = $this->createRole($newRoleData);

        if ($newRoleId) {
            $permissions = $this->permissionService->getRolePermissions($sourceRoleId);
            $permissionIds = array_column($permissions, 'id');
            
            if (!empty($permissionIds)) {
                $this->permissionService->syncRolePermissions($newRoleId, $permissionIds);
            }
        }

        $this->db->transComplete();

        return $this->db->transStatus() ? $newRoleId : null;
    }
}
