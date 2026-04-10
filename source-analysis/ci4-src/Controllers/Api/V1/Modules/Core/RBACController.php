<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class RBACController extends ResourceController
{
    protected $format = 'json';
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    // Get all roles with their permissions
    public function getRoles()
    {
        $roles = $this->db->table('roles')
            ->orderBy('hierarchy_level', 'DESC')
            ->get()
            ->getResultArray();

        foreach ($roles as &$role) {
            $role['permissions'] = $this->db->table('role_permissions rp')
                ->select('p.*')
                ->join('permissions p', 'p.id = rp.permission_id')
                ->where('rp.role_id', $role['id'])
                ->get()
                ->getResultArray();
        }

        return $this->respond([
            'status' => 'success',
            'data' => $roles
        ]);
    }

    // Get single role with permissions
    public function getRole($id)
    {
        $role = $this->db->table('roles')->where('id', $id)->get()->getRowArray();
        
        if (!$role) {
            return $this->failNotFound('Role not found');
        }

        $role['permissions'] = $this->db->table('role_permissions rp')
            ->select('p.*')
            ->join('permissions p', 'p.id = rp.permission_id')
            ->where('rp.role_id', $id)
            ->get()
            ->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data' => $role
        ]);
    }

    // Create new role
    public function createRole()
    {
        $data = $this->request->getJSON(true);

        $validation = \Config\Services::validation();
        $validation->setRules([
            'name' => 'required|is_unique[roles.name]',
            'display_name' => 'required',
            'hierarchy_level' => 'required|integer'
        ]);

        if (!$validation->run($data)) {
            return $this->fail($validation->getErrors());
        }

        $this->db->table('roles')->insert([
            'name' => $data['name'],
            'display_name' => $data['display_name'],
            'description' => $data['description'] ?? null,
            'hierarchy_level' => $data['hierarchy_level'],
            'is_system_role' => 0,
            'is_active' => 1
        ]);

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Role created successfully',
            'id' => $this->db->insertID()
        ]);
    }

    // Update role
    public function updateRole($id)
    {
        $data = $this->request->getJSON(true);

        $role = $this->db->table('roles')->where('id', $id)->get()->getRowArray();
        if (!$role) {
            return $this->failNotFound('Role not found');
        }

        if ($role['is_system_role'] && isset($data['name'])) {
            return $this->fail('Cannot modify system role name');
        }

        $updateData = [];
        if (isset($data['display_name'])) $updateData['display_name'] = $data['display_name'];
        if (isset($data['description'])) $updateData['description'] = $data['description'];
        if (isset($data['hierarchy_level'])) $updateData['hierarchy_level'] = $data['hierarchy_level'];
        if (isset($data['is_active'])) $updateData['is_active'] = $data['is_active'];

        $this->db->table('roles')->where('id', $id)->update($updateData);

        return $this->respond([
            'status' => 'success',
            'message' => 'Role updated successfully'
        ]);
    }

    // Delete role
    public function deleteRole($id)
    {
        $role = $this->db->table('roles')->where('id', $id)->get()->getRowArray();
        
        if (!$role) {
            return $this->failNotFound('Role not found');
        }

        if ($role['is_system_role']) {
            return $this->fail('Cannot delete system role');
        }

        $this->db->table('roles')->where('id', $id)->delete();

        return $this->respondDeleted([
            'status' => 'success',
            'message' => 'Role deleted successfully'
        ]);
    }

    // Assign permissions to role
    public function assignPermissions($roleId)
    {
        $data = $this->request->getJSON(true);
        $permissionIds = $data['permission_ids'] ?? [];

        $role = $this->db->table('roles')->where('id', $roleId)->get()->getRowArray();
        if (!$role) {
            return $this->failNotFound('Role not found');
        }

        // Delete existing permissions
        $this->db->table('role_permissions')->where('role_id', $roleId)->delete();

        // Insert new permissions
        foreach ($permissionIds as $permissionId) {
            $this->db->table('role_permissions')->insert([
                'role_id' => $roleId,
                'permission_id' => $permissionId
            ]);
        }

        return $this->respond([
            'status' => 'success',
            'message' => 'Permissions assigned successfully'
        ]);
    }

    // Get user roles and permissions
    public function getUserPermissions($userId)
    {
        $userRoles = $this->db->table('user_roles ur')
            ->select('r.*')
            ->join('roles r', 'r.id = ur.role_id')
            ->where('ur.user_id', $userId)
            ->get()
            ->getResultArray();

        $permissions = $this->db->query("
            SELECT DISTINCT p.*
            FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            INNER JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = ?
        ", [$userId])->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data' => [
                'roles' => $userRoles,
                'permissions' => $permissions
            ]
        ]);
    }

    // Assign role to user
    public function assignRoleToUser()
    {
        $data = $this->request->getJSON(true);

        $validation = \Config\Services::validation();
        $validation->setRules([
            'user_id' => 'required|integer',
            'role_id' => 'required|integer'
        ]);

        if (!$validation->run($data)) {
            return $this->fail($validation->getErrors());
        }

        $existing = $this->db->table('user_roles')
            ->where('user_id', $data['user_id'])
            ->where('role_id', $data['role_id'])
            ->get()
            ->getRowArray();

        if ($existing) {
            return $this->fail('User already has this role');
        }

        $this->db->table('user_roles')->insert([
            'user_id' => $data['user_id'],
            'role_id' => $data['role_id']
        ]);

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Role assigned to user successfully'
        ]);
    }

    // Remove role from user
    public function removeRoleFromUser()
    {
        $data = $this->request->getJSON(true);

        $this->db->table('user_roles')
            ->where('user_id', $data['user_id'])
            ->where('role_id', $data['role_id'])
            ->delete();

        return $this->respond([
            'status' => 'success',
            'message' => 'Role removed from user successfully'
        ]);
    }

    // Get permission matrix
    public function getPermissionMatrix()
    {
        $roles = $this->db->table('roles')
            ->orderBy('hierarchy_level', 'DESC')
            ->get()
            ->getResultArray();

        $permissions = $this->db->table('permissions')
            ->orderBy('module', 'ASC')
            ->orderBy('action', 'ASC')
            ->get()
            ->getResultArray();

        $matrix = [];
        foreach ($roles as $role) {
            $rolePermissions = $this->db->table('role_permissions')
                ->where('role_id', $role['id'])
                ->get()
                ->getResultArray();

            $permissionIds = array_column($rolePermissions, 'permission_id');
            $matrix[$role['id']] = $permissionIds;
        }

        return $this->respond([
            'status' => 'success',
            'data' => [
                'roles' => $roles,
                'permissions' => $permissions,
                'matrix' => $matrix
            ]
        ]);
    }
}
